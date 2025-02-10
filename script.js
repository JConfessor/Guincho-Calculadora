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

      // Soma a distância e a duração de cada trecho
      let totalDistance = 0; // em metros
      let totalDuration = 0; // em segundos
      ultimoLegs.forEach((leg) => {
        totalDistance += leg.distance.value;
        totalDuration += leg.duration.value;
      });
      const km = (totalDistance / 1000).toFixed(1);
      const hours = Math.floor(totalDuration / 3600);
      const minutes = Math.floor((totalDuration % 3600) / 60);
      const durationStr = (hours > 0 ? hours + " h " : "") + minutes + " min";

      document.getElementById("kmTotal").value = km;
      document.getElementById("tempoEstimado").value = durationStr;
      showToast("Distância: " + km + " km | Tempo: " + durationStr);

      if (callback) callback({ km: km, duration: totalDuration });
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

  // Detalhes dos trechos da rota (se disponíveis)
  let leg0 =
    ultimoLegs && ultimoLegs.length > 0
      ? ultimoLegs[0]
      : { duration: { text: "N/A" }, distance: { text: "N/A" } };
  let leg1 =
    ultimoLegs && ultimoLegs.length > 1
      ? ultimoLegs[1]
      : { duration: { text: "N/A" }, distance: { text: "N/A" } };
  let leg2 =
    ultimoLegs && ultimoLegs.length > 2
      ? ultimoLegs[2]
      : { duration: { text: "N/A" }, distance: { text: "N/A" } };

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
          <th>Guincho → Cliente</th>
          <td>
            Tempo: ${leg0.duration.text} <br/>
            Distância: ${leg0.distance.text}
          </td>
        </tr>
        <tr>
          <th>Cliente → Entrega</th>
          <td>
            Tempo: ${leg1.duration.text} <br/>
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
      : { duration: { text: "N/A" }, distance: { text: "N/A" } };
  const leg1 =
    ultimoLegs && ultimoLegs.length > 1
      ? ultimoLegs[1]
      : { duration: { text: "N/A" }, distance: { text: "N/A" } };

  const tempoGuinchoAteCliente = leg0.duration.text;
  const distanciaGuinchoAteCliente = leg0.distance.text;
  const tempoTransporteVeiculo = leg1.duration.text;
  const distanciaTransporteVeiculo = leg1.distance.text;
  const kmTotal = document.getElementById("kmTotal").value || "N/A";

  // Formatação dos valores de pagamento
  const pagamentoPIX = formatarMoeda(resultadoCalculado.pix);
  const pagamentoDinheiro = formatarMoeda(resultadoCalculado.dinheiro);

  // Mensagem para o Cliente
  const mensagemCliente =
    `**Informações do Serviço de Guincho**\n\n` +
    `**1. Atendimento:**\n` +
    `- **Tempo para o guincho chegar até você:** _${tempoGuinchoAteCliente}_\n` +
    `- **Distância:** _${distanciaGuinchoAteCliente}_\n\n` +
    `**2. Transporte do Veículo:**\n` +
    `- **Tempo estimado para o transporte:** _${tempoTransporteVeiculo}_\n` +
    `- **Distância:** _${distanciaTransporteVeiculo}_\n\n` +
    `**3. Resumo do Percurso:**\n` +
    `- **KM Total:** _${kmTotal}_ km\n\n` +
    `**Opções de Pagamento:**\n` +
    `- **PIX:** _${pagamentoPIX}_\n` +
    `- **Dinheiro (Espécie):** _${pagamentoDinheiro}_\n\n` +
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

function compartilharMotorista() {
  if (!resultadoCalculado) {
    showToast("Realize o cálculo antes de compartilhar.");
    return;
  }

  // Recupera os dados dos trechos da rota
  const leg0 =
    ultimoLegs && ultimoLegs.length > 0
      ? ultimoLegs[0]
      : { duration: { text: "N/A" }, distance: { text: "N/A" } };
  const leg1 =
    ultimoLegs && ultimoLegs.length > 1
      ? ultimoLegs[1]
      : { duration: { text: "N/A" }, distance: { text: "N/A" } };
  const leg2 =
    ultimoLegs && ultimoLegs.length > 2
      ? ultimoLegs[2]
      : { duration: { text: "N/A" }, distance: { text: "N/A" } };

  // Monta a mensagem para o Motorista com seções bem definidas
  const mensagemMotorista =
    `**Detalhes para o Motorista**\n\n` +
    `**Rota Completa:**\n` +
    `- **Ponto de Partida:** ${resultadoCalculado.localGuincho}\n` +
    `- **Até o Cliente:** ${resultadoCalculado.localCliente}\n` +
    `   - **Tempo:** ${leg0.duration.text}\n` +
    `   - **Distância:** ${leg0.distance.text}\n\n` +
    `- **Do Cliente ao Ponto de Entrega:** ${resultadoCalculado.localEntrega}\n` +
    `   - **Tempo:** ${leg1.duration.text}\n` +
    `   - **Distância:** ${leg1.distance.text}\n\n` +
    `- **Do Ponto de Entrega ao Retorno:** ${resultadoCalculado.localRetorno}\n` +
    `   - **Tempo:** ${leg2.duration.text}\n` +
    `   - **Distância:** ${leg2.distance.text}\n\n` +
    `**Resumo da Rota:**\n` +
    `- **KM Total:** ${document.getElementById("kmTotal").value} km\n\n` +
    `**Link da Rota:**\n` +
    `${resultadoCalculado.rotaLink}\n\n` +
    `Siga o percurso indicado e confirme as informações antes do atendimento. Boa viagem!`;

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
