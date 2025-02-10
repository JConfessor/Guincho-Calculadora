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

  // Cálculo do custo base considerando a franquia
  let kmExcedente = 0;
  if (kmTotal > kmFranquia) {
    kmExcedente = kmTotal - kmFranquia;
  }
  let baseTotal = taxa + kmExcedente * valorKm;

  // Adicional noturno (percentual)
  const adicionalPercent =
    parseFloat(document.getElementById("valorAdicional").value) || 0;
  const adicionalCalculado = baseTotal * (adicionalPercent / 100);
  baseTotal += adicionalCalculado;

  // Nota Fiscal
  const notaFiscal = document.getElementById("notaFiscalSelect").value;
  let totalComNota = baseTotal;
  if (notaFiscal === "sim") {
    const taxaNotaFiscal =
      parseFloat(document.getElementById("taxaNotaFiscal").value) || 0;
    totalComNota = baseTotal * (1 + taxaNotaFiscal / 100);
  }

  // Taxas e Descontos
  const taxaCartao =
    parseFloat(document.getElementById("taxaCartao").value) || 0;
  const descontoPix =
    parseFloat(document.getElementById("descontoPix").value) || 0;
  const descontoDinheiro =
    parseFloat(document.getElementById("descontoDinheiro").value) || 0;

  const valorCartao = totalComNota * (1 + taxaCartao / 100);
  const valorPIX = totalComNota * (1 - descontoPix / 100);
  const valorDinheiro = totalComNota * (1 - descontoDinheiro / 100);
  // Monta o HTML do resultado
  let resultadoHTML = `
    <div class="row g-3">
      <div class="col-6">Taxa de Saída:</div>
      <div class="col-6 text-end">${formatarMoeda(taxa)}</div>

      <div class="col-6">Valor por KM:</div>
      <div class="col-6 text-end">${formatarMoeda(valorKm)}</div>

      <div class="col-6">KM de Franquia:</div>
      <div class="col-6 text-end">${kmFranquia.toFixed(1)} km</div>

      <div class="col-6">KM Total:</div>
      <div class="col-6 text-end">${kmTotal.toFixed(1)} km</div>

      <div class="col-6">KM Excedente:</div>
      <div class="col-6 text-end">${kmExcedente.toFixed(1)} km</div>

      <div class="col-6">Custo (Excedente):</div>
      <div class="col-6 text-end">${formatarMoeda(kmExcedente * valorKm)}</div>

      <div class="col-6">Adicional Noturno:</div>
      <div class="col-6 text-end">${adicionalPercent}%</div>

      <div class="col-6">Valor do Adicional:</div>
      <div class="col-6 text-end">${formatarMoeda(adicionalCalculado)}</div>

      <div class="col-12 pt-2 border-top">Subtotal:</div>
      <div class="col-12 text-end">${formatarMoeda(baseTotal)}</div>
  `;

  if (notaFiscal === "sim") {
    resultadoHTML += `
      <div class="col-12">Nota Fiscal (Taxa de ${
        document.getElementById("taxaNotaFiscal").value
      }%):</div>
      <div class="col-12 text-end">${formatarMoeda(totalComNota)}</div>
    `;
  }

  resultadoHTML += `
      <div class="col-12 mt-3 pt-2 border-top">
        <div class="d-flex justify-content-between">
          <span class="highlight">Total:</span>
          <span class="highlight">${formatarMoeda(totalComNota)}</span>
        </div>
      </div>
    </div>

    <div class="mt-4">
      <h5>Simulação de Pagamento</h5>
      <table class="table table-dark table-striped">
        <thead>
          <tr>
            <th>Forma de Pagamento</th>
            <th>Valor Final</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cartão</td>
            <td>${formatarMoeda(valorCartao)}</td>
          </tr>
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
    </div>
  `;

  document.getElementById("resultado").innerHTML = resultadoHTML;

  // Salva o objeto com os valores calculados em memória
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
    cartao: valorCartao,
    pix: valorPIX,
    dinheiro: valorDinheiro,
    localGuincho: document.getElementById("localGuincho").value.trim(),
    localCliente: document.getElementById("localCliente").value.trim(),
    localEntrega: document.getElementById("localEntrega").value.trim(),
    localRetorno: document.getElementById("localRetorno").value.trim(),
    rotaLink: getRouteLink(),
  };

  // Salva no Local Storage
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
  const leg1 = ultimoLegs && ultimoLegs.length > 0 ? ultimoLegs[0] : null; // Guincho → Cliente
  const leg2 = ultimoLegs && ultimoLegs.length > 1 ? ultimoLegs[1] : null; // Cliente → Destino

  const tempoGuinchoAteCliente = leg1 ? leg1.duration.text : "N/A";
  const distanciaGuinchoAteCliente = leg1 ? leg1.distance.text : "N/A";
  const tempoTransporteVeiculo = leg2 ? leg2.duration.text : "N/A";
  const distanciaTransporteVeiculo = leg2 ? leg2.distance.text : "N/A";

  const kmTotal = document.getElementById("kmTotal").value || "N/A";

  const pagamentoCartao = formatarMoeda(resultadoCalculado.cartao);
  const pagamentoPIX = formatarMoeda(resultadoCalculado.pix);
  const pagamentoDinheiro = formatarMoeda(resultadoCalculado.dinheiro);

  // Monta a mensagem personalizada para o cliente
  const mensagemCliente = `Olá, segue as informações do seu serviço de guincho:

• Tempo estimado para o guincho chegar até você: ${tempoGuinchoAteCliente} (distância: ${distanciaGuinchoAteCliente})
• Tempo estimado para transportar seu veículo até o destino: ${tempoTransporteVeiculo} (distância: ${distanciaTransporteVeiculo})
• Total de KM percorridos: ${kmTotal} km

Opções de Pagamento:
   - Cartão: ${pagamentoCartao}
   - PIX: ${pagamentoPIX}
   - Espécie: ${pagamentoDinheiro}

Agradecemos a sua preferência!`;

  // Copia a mensagem para o clipboard e abre o WhatsApp
  navigator.clipboard
    .writeText(mensagemCliente)
    .then(() => {
      showToast("Mensagem copiada para o clipboard!");
      const urlWhats =
        "https://wa.me/?text=" + encodeURIComponent(mensagemCliente);
      window.open(urlWhats, "_blank");
    })
    .catch((err) => {
      console.error("Erro ao copiar para o clipboard: ", err);
      showToast("Erro ao copiar a mensagem.");
    });
}

/**
 * Compartilha uma mensagem para o motorista via WhatsApp, com detalhes de cada trecho.
 */
function compartilharMotorista() {
  if (!resultadoCalculado) {
    showToast("Realize o cálculo antes de compartilhar.");
    return;
  }

  // Recupera os endereços informados
  const localGuincho = resultadoCalculado.localGuincho || "N/A";
  const localCliente = resultadoCalculado.localCliente || "N/A";
  const localEntrega = resultadoCalculado.localEntrega || "N/A";
  const localRetorno = resultadoCalculado.localRetorno || "N/A";
  const kmTotal = document.getElementById("kmTotal").value || "N/A";
  const rotaLink = resultadoCalculado.rotaLink || "Link não disponível";

  // Obtém os detalhes de cada trecho, se disponíveis
  const leg1 = ultimoLegs && ultimoLegs.length > 0 ? ultimoLegs[0] : null;
  const leg2 = ultimoLegs && ultimoLegs.length > 1 ? ultimoLegs[1] : null;
  const leg3 = ultimoLegs && ultimoLegs.length > 2 ? ultimoLegs[2] : null;

  const mensagemMotorista = `Informações para o Motorista:

Rota:
- Ponto de partida: ${localGuincho}
- Até o cliente: ${localCliente}
  Tempo: ${leg1 ? leg1.duration.text : "N/A"}, Distância: ${
    leg1 ? leg1.distance.text : "N/A"
  }
- Até o ponto de entrega: ${localEntrega}
  Tempo: ${leg2 ? leg2.duration.text : "N/A"}, Distância: ${
    leg2 ? leg2.distance.text : "N/A"
  }
- Até o retorno: ${localRetorno}
  Tempo: ${leg3 ? leg3.duration.text : "N/A"}, Distância: ${
    leg3 ? leg3.distance.text : "N/A"
  }

Total de KM percorridos: ${kmTotal} km

Link da rota: ${rotaLink}`;

  // Copia a mensagem para o clipboard e abre o WhatsApp
  navigator.clipboard
    .writeText(mensagemMotorista)
    .then(() => {
      showToast("Mensagem copiada para o clipboard!");
      const urlWhats =
        "https://wa.me/?text=" + encodeURIComponent(mensagemMotorista);
      window.open(urlWhats, "_blank");
    })
    .catch((err) => {
      console.error("Erro ao copiar para o clipboard: ", err);
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
