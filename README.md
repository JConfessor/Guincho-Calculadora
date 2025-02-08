# Calculadora de Guincho – TruckCalc

**Calculadora de Guincho – TruckCalc** é uma aplicação web responsiva para o cálculo de serviços de guincho. Ela permite que o usuário obtenha um resumo detalhado dos custos envolvidos e simule diferentes formas de pagamento. Além disso, a aplicação gera um link para a rota no Google Maps (com opção de encurtamento via TinyURL) e disponibiliza mensagens de compartilhamento estilizadas para clientes e motoristas.

## Funcionalidades

- **Cálculo Completo do Serviço:**
  - **Taxa de Saída** e **Valor por KM**;
  - Cálculo de **Distância de Ida** e **Retorno** separadamente;
  - Aplicação de **Adicional Noturno** (porcentagem ou valor fixo);
  - Emissão de **Nota Fiscal** com a taxa adicional, se aplicável;
  - Cálculo do **Subtotal** e do **Total** final.

- **Simulação de Pagamento:**
  - Simulação com acréscimos e descontos para formas de pagamento (Cartão, PIX, Dinheiro/Espécie).

- **Detalhamento da Rota:**
  - Configuração da rota (Somente Ida ou Ida e Volta) com endereços de origem e destino;
  - Geração de link para a rota no Google Maps;
  - Encurtamento do link via API do TinyURL para facilitar o compartilhamento.

- **Compartilhamento:**
  - Mensagens formatadas (usando marcadores do WhatsApp, como asteriscos para negrito) contendo os detalhes do serviço e da rota;
  - Botões para copiar automaticamente as mensagens para a área de transferência;
  - Notificações (estilo "toast") que informam quando a mensagem foi copiada, sem utilizar alertas.

- **Interface Moderna e Responsiva:**
  - Desenvolvida com **Bootstrap 5** e **Font Awesome**;
  - Design otimizado para dispositivos móveis, com ajustes de margens e *padding*.

## Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript (ES6)
- [Bootstrap 5](https://getbootstrap.com/)
- [Font Awesome](https://fontawesome.com/)
- [TinyURL API](https://tinyurl.com/app/dev) (para encurtamento de links)

## Instalação

1. **Clone o repositório:**

   ```bash
   git clone https://github.com/seu-usuario/calculadora-guincho-truckcalc.git
