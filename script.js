// script.js

// Chave de API do Google Maps (a mesma usada no HTML)
const GOOGLE_MAPS_API_KEY = "AIzaSyCo6sflpepPLQznadxAQ6-leTdEmMd8-0o";

// Variáveis globais para o mapa, Directions Service e Directions Renderer
let map;
let directionsService;
let directionsRenderer;

// Variáveis para armazenar o resultado da consulta e os "legs" retornados
let resultadoCalculado = null;
let ultimoLegs = null;

/**
 * Formata um valor numérico para o padrão de moeda BRL.
 * Exemplo: 150 → "R$ 150,00"
 * @param {number} valor
 * @returns {string}
 */
function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Formata um tempo em segundos para o padrão "X h Y min".
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  let totalMinutes = Math.floor(seconds / 60);
  let hours = Math.floor(totalMinutes / 60);
  let minutes = totalMinutes % 60;
  return (hours > 0 ? hours + " h " : "") + minutes + " min";
}

/**
 * Retorna a URL para a rota no Google Maps, com base nos valores dos inputs.
 * @returns {string|null}
 */
function getRouteLink() {
  const localGuincho = document.getElementById("localGuincho").value.trim();
  const localCliente = document.getElementById("localCliente").value.trim();
  const localEntrega = document.getElementById("localEntrega").value.trim();
  const localRetorno = document.getElementById("localRetorno").value.trim();
  if (localGuincho && localCliente && localEntrega && localRetorno) {
    const origin = encodeURIComponent(localGuincho);
    const destination = encodeURIComponent(localRetorno);
    const waypoints =
      encodeURIComponent(localCliente) + "|" + encodeURIComponent(localEntrega);
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
  } else {
    showToast("Preencha todos os campos de Detalhes de Rota.");
    return null;
  }
}

/**
 * Encurta uma URL utilizando a API do TinyURL (não necessita de token).
 * @param {string} url - URL longa a ser encurtada.
 * @returns {Promise<string>} - Promise que resolve para a URL encurtada.
 */
function encurtarLink(url) {
  return fetch(
    "https://tinyurl.com/api-create.php?url=" + encodeURIComponent(url)
  )
    .then((response) => response.text())
    .catch((err) => {
      console.error("Erro ao encurtar URL:", err);
      // Em caso de erro, retorna a URL original
      return url;
    });
}

/**
 * Abre o link da rota no Google Maps em uma nova aba.
 */
function abrirGoogleMaps() {
  const link = getRouteLink();
  if (link) {
    window.open(link, "_blank");
  } else {
    mostrarErro("Preencha os campos de Detalhes de Rota para explorar a rota.");
  }
}

/**
 * Exibe uma notificação (toast) no canto inferior direito.
 * @param {string} mensagem
 */
function showToast(mensagem) {
  const toast = document.getElementById("toast");
  toast.innerText = mensagem;
  toast.style.opacity = "1";
  setTimeout(() => {
    toast.style.opacity = "0";
  }, 3000);
}

/**
 * Inicializa o mapa, Directions Service e Directions Renderer.
 */
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: -23.55052, lng: -46.633308 },
    zoom: 12,
  });
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);
}

/**
 * Calcula a rota utilizando o Directions Service.
 * Atualiza os campos "KM Total" e "Tempo Estimado" e exibe o mapa.
 * Armazena o array de "legs" na variável global "ultimoLegs".
 * Aplica os ajustes:
 * - Adiciona 15 minutos ao tempo do trecho Guincho → Cliente;
 * - Aumenta em 30% o tempo do trecho Cliente → Entrega;
 * - Acrescenta 15 minutos de carga/descarga no tempo total.
 * @param {function} callback - Função opcional a ser chamada após o cálculo.
 */
function calcularRota(callback) {
  const localGuincho = document.getElementById("localGuincho").value.trim();
  const localCliente = document.getElementById("localCliente").value.trim();
  const localEntrega = document.getElementById("localEntrega").value.trim();
  const localRetorno = document.getElementById("localRetorno").value.trim();

  if (!localGuincho || !localCliente || !localEntrega || !localRetorno) {
    showToast("Preencha todos os campos de Detalhes de Rota.");
    console.error("Erro: Nem todos os endereços foram informados.");
    if (callback) callback(null);
    return;
  }

  const request = {
    origin: localGuincho,
    destination: localRetorno,
    waypoints: [
      { location: localCliente, stopover: true },
      { location: localEntrega, stopover: true },
    ],
    travelMode: google.maps.TravelMode.DRIVING,
  };

  console.log("Directions Request:", request);

  directionsService.route(request, (result, status) => {
    console.log("Directions Service status:", status);
    console.log("Directions Service result:", result);

    if (status === google.maps.DirectionsStatus.OK) {
      directionsRenderer.setDirections(result);
      document.getElementById("mapCard").style.display = "block";

      // Armazena os legs para uso no compartilhamento
      ultimoLegs = result.routes[0].legs;

      // Calcula a distância total normalmente
      let totalDistance = 0; // em metros
      ultimoLegs.forEach((leg) => {
        totalDistance += leg.distance.value;
      });

      // Aplica os ajustes de tempo:
      // - Adiciona 15 min (900 s) no trecho Guincho → Cliente
      // - Aumenta em 30% o tempo no trecho Cliente → Entrega
      // - Trecho Entrega → Retorno permanece inalterado
      // - Acrescenta 15 min (900 s) de carga/descarga no total
      let leg0Sec = ultimoLegs[0] ? ultimoLegs[0].duration.value : 0;
      let leg1Sec = ultimoLegs[1] ? ultimoLegs[1].duration.value : 0;
      let leg2Sec = ultimoLegs[2] ? ultimoLegs[2].duration.value : 0;
      let adjustedLeg0 = leg0Sec + 900; // 15 min a mais
      let adjustedLeg1 = leg1Sec * 1.3; // 30% a mais
      let adjustedLeg2 = leg2Sec; // sem alteração
      let extraLoadUnload = 900; // 15 min para carga/descarga
      let totalDurationAdjusted =
        adjustedLeg0 + adjustedLeg1 + adjustedLeg2 + extraLoadUnload;

      const km = (totalDistance / 1000).toFixed(1);
      const durationStr = formatDuration(totalDurationAdjusted);

      document.getElementById("kmTotal").value = km;
      document.getElementById("tempoEstimado").value = durationStr;
      showToast("Distância: " + km + " km | Tempo: " + durationStr);

      if (callback) callback({ km: km, duration: totalDurationAdjusted });
    } else {
      showToast("Erro ao calcular a rota: " + status);
      console.error("Directions request returned no results:", status);
      if (callback) callback(null);
    }
  });
}

/**
 * Função chamada ao clicar no botão "Consultar Rota".
 * Realiza a consulta à API, atualiza os cálculos e exibe o mapa.
 */
function consultarRota() {
  calcularRota(function () {
    performCostCalculation();
    // Não sobrescrevemos os inputs de endereço para manter o que o usuário digitou.
  });
}

/**
 * Executa o cálculo dos custos do serviço (simulação de pagamento, etc).
 * Considera o KM de Franquia dentro da taxa de saída.
 * Atualiza o resumo exibido na tela com os tempos ajustados e adiciona uma linha
 * para o tempo de carga/descarga.
 */
function performCostCalculation() {
  const taxa = parseFloat(document.getElementById("taxa").value) || 0;
  const valorKm = parseFloat(document.getElementById("km").value) || 0;
  const kmTotal = parseFloat(document.getElementById("kmTotal").value) || 0;
  const kmFranquia =
    parseFloat(document.getElementById("kmFranquia").value) || 0;

  let kmExcedente = 0;
  if (kmTotal > kmFranquia) {
    kmExcedente = kmTotal - kmFranquia;
  }
  let baseTotal = taxa + kmExcedente * valorKm;

  const adicionalPercent =
    parseFloat(document.getElementById("valorAdicional").value) || 0;
  const adicionalCalculado = baseTotal * (adicionalPercent / 100);
  baseTotal += adicionalCalculado;

  const notaFiscal = document.getElementById("notaFiscalSelect").value;
  let totalComNota = baseTotal;
  if (notaFiscal === "sim") {
    const taxaNotaFiscal =
      parseFloat(document.getElementById("taxaNotaFiscal").value) || 0;
    totalComNota = baseTotal * (1 + taxaNotaFiscal / 100);
  }

  const descontoPix =
    parseFloat(document.getElementById("descontoPix").value) || 0;
  const descontoDinheiro =
    parseFloat(document.getElementById("descontoDinheiro").value) || 0;
  const valorPIX = totalComNota * (1 - descontoPix / 100);
  const valorDinheiro = totalComNota * (1 - descontoDinheiro / 100);

  // Recupera e ajusta os tempos dos trechos da rota
  let leg0 =
    ultimoLegs && ultimoLegs.length > 0
      ? ultimoLegs[0]
      : { duration: { text: "N/A", value: 0 }, distance: { text: "N/A" } };
  let leg1 =
    ultimoLegs && ultimoLegs.length > 1
      ? ultimoLegs[1]
      : { duration: { text: "N/A", value: 0 }, distance: { text: "N/A" } };
  let leg2 =
    ultimoLegs && ultimoLegs.length > 2
      ? ultimoLegs[2]
      : { duration: { text: "N/A" }, distance: { text: "N/A" } };

  let adjustedLeg0Text = leg0.duration.value
    ? formatDuration(leg0.duration.value + 900)
    : "N/A";
  let adjustedLeg1Text = leg1.duration.value
    ? formatDuration(leg1.duration.value * 1.3)
    : "N/A";

  let rotaDetalhesHTML = `
    <table class="table table-dark table-striped table-bordered table-sm result-table">
      <tbody>
        <tr>
          <th>Origem</th>
          <td>${document.getElementById("localGuincho").value}</td>
        </tr>
        <tr>
          <th>Cliente</th>
          <td>${document.getElementById("localCliente").value}</td>
        </tr>
        <tr>
          <th>Ponto de Entrega</th>
          <td>${document.getElementById("localEntrega").value}</td>
        </tr>
        <tr>
          <th>Retorno</th>
          <td>${document.getElementById("localRetorno").value}</td>
        </tr>
        <tr>
          <th>KM Total</th>
          <td>${kmTotal.toFixed(1)} km</td>
        </tr>
        <tr>
          <th>Tempo Estimado</th>
          <td>${document.getElementById("tempoEstimado").value}</td>
        </tr>
        <tr>
          <th>Tempo de Saída (Já está adicionado no tempo Guincho → Cliente) </th>
          <td>15 min</td>
        </tr>
        <tr>
          <th>Guincho → Cliente</th>
          <td>
            Tempo: ${adjustedLeg0Text} <br/>
            Distância: ${leg0.distance.text}
          </td>
        </tr>
        <tr>
          <th>Cliente → Entrega</th>
          <td>
            Tempo: ${adjustedLeg1Text} <br/>
            Distância: ${leg1.distance.text}
          </td>
        </tr>
        <tr>
          <th>Entrega → Retorno</th>
          <td>
            Tempo: ${leg2.duration.text} <br/>
            Distância: ${leg2.distance.text}
          </td>
        </tr>
        <tr>
          <th>Tempo de Carga/Descarga</th>
          <td>15 min</td>
        </tr>
      </tbody>
    </table>`;

  let calculoDetalhesHTML = `
    <table class="table table-dark table-striped table-bordered table-sm result-table">
      <tbody>
        <tr>
          <th>Taxa de Saída</th>
          <td>${formatarMoeda(taxa)}</td>
        </tr>
        <tr>
          <th>Valor por KM</th>
          <td>${formatarMoeda(valorKm)}</td>
        </tr>
        <tr>
          <th>KM de Franquia</th>
          <td>${kmFranquia.toFixed(1)} km</td>
        </tr>
        <tr>
          <th>KM Excedente</th>
          <td>${kmExcedente.toFixed(1)} km</td>
        </tr>
        <tr>
          <th>Custo Excedente</th>
          <td>${formatarMoeda(kmExcedente * valorKm)}</td>
        </tr>
        <tr>
          <th>Adicional Noturno</th>
          <td>${adicionalPercent}%</td>
        </tr>
        <tr>
          <th>Valor do Adicional</th>
          <td>${formatarMoeda(adicionalCalculado)}</td>
        </tr>
        <tr>
          <th>Subtotal</th>
          <td>${formatarMoeda(baseTotal)}</td>
        </tr>
        ${
          notaFiscal === "sim"
            ? `<tr>
          <th>Nota Fiscal</th>
          <td>${formatarMoeda(totalComNota)}</td>
        </tr>`
            : ""
        }
        <tr class="fw-bold">
          <th>Total</th>
          <td>${formatarMoeda(totalComNota)}</td>
        </tr>
      </tbody>
    </table>`;

  let simulacaoPagamentoHTML = `
    <div class="mt-4">
      <h5>Simulação de Pagamento</h5>
      <table class="table table-dark table-striped table-bordered table-sm">
        <thead>
          <tr>
            <th>Forma de Pagamento</th>
            <th>Valor Final</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>PIX</td>
            <td>${formatarMoeda(valorPIX)}</td>
          </tr>
          <tr>
            <td>Dinheiro (Espécie)</td>
            <td>${formatarMoeda(valorDinheiro)}</td>
          </tr>
        </tbody>
      </table>
    </div>`;

  let resultadoHTML = `
    <div class="row">
      <div class="col-md-6 mb-3">
        <h5>Detalhes da Rota</h5>
        ${rotaDetalhesHTML}
      </div>
      <div class="col-md-6 mb-3">
        <h5>Detalhes do Cálculo</h5>
        ${calculoDetalhesHTML}
      </div>
    </div>
    ${simulacaoPagamentoHTML}`;

  document.getElementById("resultado").innerHTML = resultadoHTML;

  // Salva os dados calculados para uso posterior (compartilhamento, etc.)
  resultadoCalculado = {
    taxa,
    kmTotal,
    kmFranquia,
    kmExcedente,
    valorKm,
    adicionalPercent,
    adicionalCalculado,
    subtotal: baseTotal,
    total: totalComNota,
    pix: valorPIX,
    dinheiro: valorDinheiro,
    localGuincho: document.getElementById("localGuincho").value,
    localCliente: document.getElementById("localCliente").value,
    localEntrega: document.getElementById("localEntrega").value,
    localRetorno: document.getElementById("localRetorno").value,
    rotaLink: getRouteLink(),
  };

  salvarLocalStorage();
}

/**
 * Compartilha a mensagem para o cliente via WhatsApp.
 * A mensagem inclui tempos e valores finais.
 */
function compartilharCliente() {
  if (!resultadoCalculado) {
    showToast("Realize o cálculo antes de compartilhar.");
    return;
  }

  // Recupera os dados dos trechos da rota
  const leg0 =
    ultimoLegs && ultimoLegs.length > 0
      ? ultimoLegs[0]
      : { duration: { text: "N/A", value: 0 }, distance: { text: "N/A" } };
  const leg1 =
    ultimoLegs && ultimoLegs.length > 1
      ? ultimoLegs[1]
      : { duration: { text: "N/A", value: 0 }, distance: { text: "N/A" } };

  // Aplica os ajustes:
  // - Adiciona 15 minutos (900 s) no tempo do trecho Guincho → Cliente
  // - Aumenta em 30% o tempo do trecho Cliente → Entrega
  const tempoAtendimento = leg0.duration.value
    ? formatDuration(leg0.duration.value + 900)
    : "N/A";
  const tempoTransporte = leg1.duration.value
    ? formatDuration(leg1.duration.value * 1.3)
    : "N/A";

  const distanciaGuinchoAteCliente = leg0.distance.text;
  const distanciaTransporteVeiculo = leg1.distance.text;
  const kmTotal = document.getElementById("kmTotal").value || "N/A";

  // Formatação dos valores de pagamento
  const pagamentoPIX = formatarMoeda(resultadoCalculado.pix);
  const pagamentoDinheiro = formatarMoeda(resultadoCalculado.dinheiro);

  // Mensagem atualizada para o Cliente com os tempos ajustados, usando apenas 1 * para formatação
  const mensagemCliente =
    `*Informações do Serviço de Guincho*\n\n` +
    `*1. Atendimento:*\n` +
    `- *Tempo para o guincho chegar até você:* _${tempoAtendimento}_\n` +
    `- *Distância:* _${distanciaGuinchoAteCliente}_\n\n` +
    `*2. Transporte do Veículo:*\n` +
    `- *Tempo estimado para o transporte:* _${tempoTransporte}_\n` +
    `- *Distância:* _${distanciaTransporteVeiculo}_\n\n` +
    `*3. Resumo do Percurso:*\n` +
    `- *KM Total:* _${kmTotal}_ km\n\n` +
    `*Opções de Pagamento:*\n` +
    `- *PIX:* _${pagamentoPIX}_\n` +
    `- *Dinheiro (Espécie):* _${pagamentoDinheiro}_\n\n` +
    `Agradecemos sua preferência e estamos à disposição para quaisquer dúvidas!`;

  navigator.clipboard
    .writeText(mensagemCliente)
    .then(() => {
      showToast("Mensagem para o cliente copiada para o clipboard!");
      const urlWhats =
        "https://wa.me/?text=" + encodeURIComponent(mensagemCliente);
      window.open(urlWhats, "_blank");
    })
    .catch((err) => {
      console.error("Erro ao copiar a mensagem para o clipboard:", err);
      showToast("Erro ao copiar a mensagem.");
    });
}

/**
 * Compartilha a mensagem para o motorista via WhatsApp.
 * A mensagem é exibida em caixa alta e utiliza apenas 1 * para formatação.
 */
function compartilharMotorista() {
  if (!resultadoCalculado) {
    showToast("Realize o cálculo antes de compartilhar.");
    return;
  }

  // Recupera os dados dos trechos da rota e aplica os ajustes
  let leg0 =
    ultimoLegs && ultimoLegs.length > 0
      ? ultimoLegs[0]
      : { duration: { text: "N/A", value: 0 }, distance: { text: "N/A" } };
  let leg1 =
    ultimoLegs && ultimoLegs.length > 1
      ? ultimoLegs[1]
      : { duration: { text: "N/A", value: 0 }, distance: { text: "N/A" } };
  let leg2 =
    ultimoLegs && ultimoLegs.length > 2
      ? ultimoLegs[2]
      : { duration: { text: "N/A" }, distance: { text: "N/A" } };

  let adjustedLeg0Sec = leg0.duration.value + 900;
  let adjustedLeg1Sec = leg1.duration.value * 1.3;
  let adjustedLeg0Text = adjustedLeg0Sec
    ? formatDuration(adjustedLeg0Sec)
    : "N/A";
  let adjustedLeg1Text = adjustedLeg1Sec
    ? formatDuration(adjustedLeg1Sec)
    : "N/A";

  // Encurta o link da rota e monta a mensagem com a URL encurtada
  encurtarLink(resultadoCalculado.rotaLink).then((shortUrl) => {
    let mensagemMotorista =
      `*DETALHES PARA O MOTORISTA*\n\n` +
      `*ROTA COMPLETA:*\n` +
      `- *PONTO DE PARTIDA:* ${resultadoCalculado.localGuincho}\n` +
      `- *ATÉ O CLIENTE:* ${resultadoCalculado.localCliente}\n` +
      `   - *TEMPO:* ${adjustedLeg0Text}\n` +
      `   - *DISTÂNCIA:* ${leg0.distance.text}\n\n` +
      `- *DO CLIENTE AO PONTO DE ENTREGA:* ${resultadoCalculado.localEntrega}\n` +
      `   - *TEMPO:* ${adjustedLeg1Text}\n` +
      `   - *DISTÂNCIA:* ${leg1.distance.text}\n\n` +
      `- *DO PONTO DE ENTREGA AO RETORNO:* ${resultadoCalculado.localRetorno}\n` +
      `   - *TEMPO:* ${leg2.duration.text}\n` +
      `   - *DISTÂNCIA:* ${leg2.distance.text}\n\n` +
      `*RESUMO DA ROTA:*\n` +
      `- *KM TOTAL:* ${document.getElementById("kmTotal").value} KM\n\n` +
      `*TEMPO ADICIONAL DE CARGA/DESCARGA:* 15 MIN\n\n` +
      `*LINK DA ROTA:*\n` +
      `${shortUrl}\n\n` +
      `SIGA O PERCURSO INDICADO E CONFIRME AS INFORMAÇÕES ANTES DO ATENDIMENTO. BOA VIAGEM!`;

    // Converte toda a mensagem para caixa alta
    mensagemMotorista = mensagemMotorista.toUpperCase();

    navigator.clipboard
      .writeText(mensagemMotorista)
      .then(() => {
        showToast("Mensagem para o motorista copiada para o clipboard!");
        const urlWhats =
          "https://wa.me/?text=" + encodeURIComponent(mensagemMotorista);
        window.open(urlWhats, "_blank");
      })
      .catch((err) => {
        console.error("Erro ao copiar a mensagem para o clipboard:", err);
        showToast("Erro ao copiar a mensagem.");
      });
  });
}

/**
 * Limpa os inputs, o resultado e remove os dados do Local Storage.
 */
function limparCampos() {
  document.querySelectorAll("input").forEach((input) => (input.value = ""));
  document.getElementById("notaFiscalSelect").value = "sim";
  document.getElementById("taxaNotaFiscal").disabled = false;
  document.getElementById("resultado").innerHTML =
    '<div class="text-center text-muted">Preencha os dados para ver o cálculo</div>';
  localStorage.removeItem("ultimoCalculo");
  resultadoCalculado = null;
  ultimoLegs = null;
  document.getElementById("mapCard").style.display = "none";
}

/**
 * Exibe uma mensagem de erro no container de resultado.
 */
function mostrarErro(mensagem) {
  document.getElementById(
    "resultado"
  ).innerHTML = `<div class="alert alert-danger mt-3">${mensagem}</div>`;
}

/**
 * Salva os dados do último cálculo no Local Storage.
 */
function salvarLocalStorage() {
  const dados = {
    taxa: document.getElementById("taxa").value,
    km: document.getElementById("km").value,
    kmTotal: document.getElementById("kmTotal").value,
    kmFranquia: document.getElementById("kmFranquia").value,
    valorAdicional: document.getElementById("valorAdicional").value,
    localGuincho: document.getElementById("localGuincho").value,
    localCliente: document.getElementById("localCliente").value,
    localEntrega: document.getElementById("localEntrega").value,
    localRetorno: document.getElementById("localRetorno").value,
    notaFiscalSelect: document.getElementById("notaFiscalSelect").value,
    taxaNotaFiscal: document.getElementById("taxaNotaFiscal").value,
    taxaCartao: document.getElementById("taxaCartao").value,
    descontoPix: document.getElementById("descontoPix").value,
    descontoDinheiro: document.getElementById("descontoDinheiro").value,
  };
  localStorage.setItem("ultimoCalculo", JSON.stringify(dados));
}

// ========================
// Event listeners apenas para formatação dos inputs
// ========================

// Para inputs numéricos (não monetários)
document
  .querySelectorAll('input[type="number"]:not(.money)')
  .forEach((input) => {
    input.addEventListener("keypress", function (e) {
      let char = String.fromCharCode(e.which);
      if (!/[0-9.]/.test(char)) {
        e.preventDefault();
      }
      if (char === "." && this.value.includes(".")) {
        e.preventDefault();
      }
    });
    input.addEventListener("input", function (e) {
      this.value = this.value.replace(/[^0-9.]/g, "");
    });
  });

// Para inputs monetários: interpreta o valor digitado como centavos e atualiza em tempo real.
// Exemplo: digitar "15000" fica "150.00".
document.querySelectorAll(".money").forEach((input) => {
  input.addEventListener("input", function (e) {
    let digits = this.value.replace(/\D/g, "");
    if (digits === "") {
      this.value = "";
      return;
    }
    let numberValue = parseInt(digits, 10) / 100;
    this.value = numberValue.toFixed(2);
  });
  input.addEventListener("blur", function (e) {
    if (this.value !== "") {
      let digits = this.value.replace(/\D/g, "");
      if (digits === "") {
        this.value = "";
        return;
      }
      let numberValue = parseInt(digits, 10) / 100;
      this.value = numberValue.toFixed(2);
    }
  });
});

// ========================
// Ao carregar a página: carrega dados salvos (se houver)
// ========================
window.addEventListener("load", function () {
  const dadosSalvos = localStorage.getItem("ultimoCalculo");
  if (dadosSalvos) {
    const dados = JSON.parse(dadosSalvos);
    Object.keys(dados).forEach((key) => {
      const element = document.getElementById(key);
      if (element) {
        element.value = dados[key];
      }
    });
  }
});

// Expondo funções para o escopo global (para que o HTML e a API do Google Maps as encontrem)
window.initMap = initMap;
window.consultarRota = consultarRota;
window.abrirGoogleMaps = abrirGoogleMaps;
window.limparCampos = limparCampos;
window.compartilharCliente = compartilharCliente;
window.compartilharMotorista = compartilharMotorista;
