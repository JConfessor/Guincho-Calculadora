// Variável global para armazenar o último resultado calculado
let resultadoCalculado = null;

/**
 * Formata um valor numérico para o padrão de moeda BRL.
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
 * Retorna a URL para a rota no Google Maps com base nos dados informados.
 * Considera o tipo de rota (somente ida ou ida e volta).
 * @returns {string|null}
 */
function getRouteLink() {
  const origem = document.getElementById("origem").value.trim();
  const destino = document.getElementById("destino").value.trim();
  const tipoRota = document.getElementById("tipoRota").value;
  if (origem && destino) {
    const origemEncoded = encodeURIComponent(origem);
    const destinoEncoded = encodeURIComponent(destino);
    if (tipoRota === "ida") {
      return `https://www.google.com/maps/dir/?api=1&origin=${origemEncoded}&destination=${destinoEncoded}&travelmode=driving`;
    } else if (tipoRota === "idaEvolta") {
      return `https://www.google.com/maps/dir/?api=1&origin=${origemEncoded}&destination=${origemEncoded}&waypoints=${destinoEncoded}&travelmode=driving`;
    }
  }
  return null;
}

/**
 * Utiliza a API do TinyURL para encurtar o link passado.
 * @param {string} url
 * @returns {Promise<string>}
 */
function shortenUrl(url) {
  return fetch(
    "https://tinyurl.com/api-create.php?url=" + encodeURIComponent(url)
  ).then((response) => response.text());
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
 * Realiza os cálculos e exibe o resultado, incluindo a simulação de pagamento.
 */
function calcular() {
  try {
    // Obter valores dos inputs
    const taxa = parseFloat(document.getElementById("taxa").value) || 0;
    const km = parseFloat(document.getElementById("km").value) || 0;
    const distanciaIda =
      parseFloat(document.getElementById("distanciaIda").value) || 0;
    const distanciaRetorno =
      parseFloat(document.getElementById("distanciaRetorno").value) || 0;
    const tipo = document.getElementById("tipoAdicional").value;
    const adicional =
      parseFloat(document.getElementById("valorAdicional").value) || 0;
    const distanciaTotal = distanciaIda + distanciaRetorno;

    // Cálculo do subtotal (sem Nota Fiscal)
    let baseTotal = taxa + km * distanciaTotal;
    let adicionalCalculado = 0;
    if (tipo === "porcentagem") {
      adicionalCalculado = baseTotal * (adicional / 100);
      baseTotal += adicionalCalculado;
    } else {
      adicionalCalculado = adicional;
      baseTotal += adicional;
    }

    // Verifica se foi selecionada a emissão de Nota Fiscal via dropdown
    const notaFiscal = document.getElementById("notaFiscalSelect").value; // "sim" ou "nao"
    let totalComNota = baseTotal;
    if (notaFiscal === "sim") {
      const taxaNotaFiscal =
        parseFloat(document.getElementById("taxaNotaFiscal").value) || 0;
      totalComNota = baseTotal * (1 + taxaNotaFiscal / 100);
    }

    // Simulação para as formas de pagamento
    const taxaCartao =
      parseFloat(document.getElementById("taxaCartao").value) || 0;
    const descontoPix =
      parseFloat(document.getElementById("descontoPix").value) || 0;
    const descontoDinheiro =
      parseFloat(document.getElementById("descontoDinheiro").value) || 0;

    const valorCartao = totalComNota * (1 + taxaCartao / 100);
    const valorPIX = totalComNota * (1 - descontoPix / 100);
    const valorDinheiro = totalComNota * (1 - descontoDinheiro / 100);

    // Monta o HTML do resultado com informações adicionais
    let resultadoHTML = `
      <div class="row g-3">
        <div class="col-6">Taxa de Saída:</div>
        <div class="col-6 text-end">${formatarMoeda(taxa)}</div>
        
        <div class="col-6">KM de Ida:</div>
        <div class="col-6 text-end">${distanciaIda} km</div>
        
        <div class="col-6">KM de Retorno:</div>
        <div class="col-6 text-end">${distanciaRetorno} km</div>
        
        <div class="col-6">Valor por KM:</div>
        <div class="col-6 text-end">${formatarMoeda(km)}</div>
        
        <div class="col-6">Custo por KM (Total):</div>
        <div class="col-6 text-end">${formatarMoeda(km * distanciaTotal)}</div>
        
        <div class="col-6">Adicional Noturno:</div>
        <div class="col-6 text-end">${
          tipo === "porcentagem" ? adicional + "%" : formatarMoeda(adicional)
        }</div>
        
        <div class="col-6">Valor do Adicional:</div>
        <div class="col-6 text-end">${formatarMoeda(adicionalCalculado)}</div>
        
        <div class="col-12 pt-2 border-top">Subtotal:</div>
        <div class="col-12 text-end">${formatarMoeda(baseTotal)}</div>
    `;
    if (notaFiscal === "sim") {
      resultadoHTML += `
        <div class="col-12">Taxa Nota Fiscal (${
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

    // Armazena os dados do último cálculo para uso no compartilhamento
    resultadoCalculado = {
      taxa: taxa,
      kmIda: distanciaIda,
      kmRetorno: distanciaRetorno,
      custoKm: km * distanciaTotal,
      adicional:
        tipo === "porcentagem" ? adicional + "%" : formatarMoeda(adicional),
      adicionalCalculado: adicionalCalculado,
      subtotal: baseTotal,
      total: totalComNota,
      cartao: valorCartao,
      pix: valorPIX,
      dinheiro: valorDinheiro,
      origem: document.getElementById("origem").value.trim(),
      destino: document.getElementById("destino").value.trim(),
      tipoRota: document.getElementById("tipoRota").value,
      rotaLink: getRouteLink(),
    };

    salvarLocalStorage();
  } catch (error) {
    mostrarErro("Erro nos valores informados! Verifique os campos.");
  }
}

/**
 * Abre o Google Maps em uma nova aba com as direções de acordo com o tipo de rota selecionado.
 */
function abrirGoogleMaps() {
  const link = getRouteLink();
  if (link) {
    window.open(link, "_blank");
  } else {
    mostrarErro(
      "Informe os endereços de origem e destino para explorar a rota."
    );
  }
}

/**
 * Compartilha os detalhes completos (para o cliente) utilizando marcadores do WhatsApp.
 * A mensagem inclui os KM de ida e de retorno, além de um link encurtado da rota.
 */
async function compartilharCliente() {
  if (!resultadoCalculado) {
    mostrarErro("Realize o cálculo antes de compartilhar.");
    return;
  }
  let linkOriginal = resultadoCalculado.rotaLink;
  let shortUrl = linkOriginal;
  try {
    shortUrl = await shortenUrl(linkOriginal);
  } catch (error) {
    shortUrl = linkOriginal;
  }
  let mensagem =
    `*Detalhes do Serviço de Guincho*\n\n` +
    `*Taxa de Saída:* ${formatarMoeda(resultadoCalculado.taxa)}\n` +
    `*KM de Ida:* ${resultadoCalculado.kmIda} km\n` +
    `*KM de Retorno:* ${resultadoCalculado.kmRetorno} km\n` +
    `*Valor por KM:* ${formatarMoeda(
      resultadoCalculado.custoKm /
        (resultadoCalculado.kmIda + resultadoCalculado.kmRetorno)
    )}\n` +
    `*Custo Total por KM:* ${formatarMoeda(resultadoCalculado.custoKm)}\n` +
    `*Adicional Noturno:* ${resultadoCalculado.adicional}\n` +
    `*Valor do Adicional:* ${formatarMoeda(
      resultadoCalculado.adicionalCalculado
    )}\n` +
    `*Subtotal:* ${formatarMoeda(resultadoCalculado.subtotal)}\n`;

  if (document.getElementById("notaFiscalSelect").value === "sim") {
    mensagem += `*Nota Fiscal:* Sim (Taxa: ${
      document.getElementById("taxaNotaFiscal").value
    }%)\n`;
  } else {
    mensagem += `*Nota Fiscal:* Não\n`;
  }

  mensagem +=
    `*Total:* ${formatarMoeda(resultadoCalculado.total)}\n\n` +
    `*Simulação de Pagamento:*\n` +
    `- Cartão: ${formatarMoeda(resultadoCalculado.cartao)}\n` +
    `- PIX: ${formatarMoeda(resultadoCalculado.pix)}\n` +
    `- Dinheiro: ${formatarMoeda(resultadoCalculado.dinheiro)}\n\n` +
    `*Rota:*\n` +
    `Origem: ${resultadoCalculado.origem}\n` +
    `Destino: ${resultadoCalculado.destino}\n` +
    `Link: ${shortUrl}`;

  navigator.clipboard
    .writeText(mensagem)
    .then(() => {
      showToast(
        "Mensagem para o cliente copiada para a área de transferência!"
      );
    })
    .catch(() => {
      showToast("Falha ao copiar a mensagem.");
    });
}

/**
 * Compartilha os detalhes da rota (para o motorista), sem os valores.
 * A mensagem inclui os KM de ida e de retorno, além de um link encurtado da rota.
 */
async function compartilharMotorista() {
  if (!resultadoCalculado) {
    mostrarErro("Realize o cálculo antes de compartilhar.");
    return;
  }
  let linkOriginal = resultadoCalculado.rotaLink;
  let shortUrl = linkOriginal;
  try {
    shortUrl = await shortenUrl(linkOriginal);
  } catch (error) {
    shortUrl = linkOriginal;
  }
  let mensagem =
    `*Detalhes da Rota para Guincho*\n\n` +
    `*Origem:* ${resultadoCalculado.origem}\n` +
    `*Destino:* ${resultadoCalculado.destino}\n` +
    `*KM de Ida:* ${resultadoCalculado.kmIda} km\n` +
    `*KM de Retorno:* ${resultadoCalculado.kmRetorno} km\n` +
    `*Tipo de Rota:* ${
      resultadoCalculado.tipoRota === "ida" ? "Somente Ida" : "Ida e Volta"
    }\n` +
    `Link: ${shortUrl}`;

  navigator.clipboard
    .writeText(mensagem)
    .then(() => {
      showToast(
        "Mensagem para o motorista copiada para a área de transferência!"
      );
    })
    .catch(() => {
      showToast("Falha ao copiar a mensagem.");
    });
}

/**
 * Limpa todos os campos, o resultado exibido e o armazenamento local.
 */
function limparCampos() {
  document.querySelectorAll("input").forEach((input) => (input.value = ""));
  // Reseta o dropdown de Nota Fiscal para o padrão "Sim"
  document.getElementById("notaFiscalSelect").value = "sim";
  document.getElementById("taxaNotaFiscal").disabled = false;
  document.getElementById("resultado").innerHTML =
    '<div class="text-center text-muted">Preencha os dados para ver o cálculo</div>';
  localStorage.removeItem("ultimoCalculo");
  resultadoCalculado = null;
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
    distanciaIda: document.getElementById("distanciaIda").value,
    distanciaRetorno: document.getElementById("distanciaRetorno").value,
    tipoAdicional: document.getElementById("tipoAdicional").value,
    valorAdicional: document.getElementById("valorAdicional").value,
    origem: document.getElementById("origem").value,
    destino: document.getElementById("destino").value,
    tipoRota: document.getElementById("tipoRota").value,
    notaFiscalSelect: document.getElementById("notaFiscalSelect").value,
    taxaNotaFiscal: document.getElementById("taxaNotaFiscal").value,
    taxaCartao: document.getElementById("taxaCartao").value,
    descontoPix: document.getElementById("descontoPix").value,
    descontoDinheiro: document.getElementById("descontoDinheiro").value,
  };
  localStorage.setItem("ultimoCalculo", JSON.stringify(dados));
}

/**
 * Carrega os dados salvos no Local Storage ao iniciar.
 */
window.onload = function () {
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
};
