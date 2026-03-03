document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("atividade-form");
  const resultadoDiv = document.getElementById("resultado");
  const resultadoText = document.getElementById("resultado-text");
  const copyButton = document.getElementById("copy-button");

  form.addEventListener("submit", handleFormSubmit);
  copyButton.addEventListener("click", handleCopyButtonClick);

  function handleFormSubmit(event) {
    event.preventDefault();

    const capitulo = document.getElementById("capitulo").value.trim();
    const atividadesInput = document.getElementById("atividade").value.trim();

    if (!capitulo || !atividadesInput) {
      showToast("Erro", "Preencha o nome do capítulo e as atividades", "error");
      return;
    }

    fetch("gabarito.json")
      .then((response) => response.json())
      .then((data) => processarAtividades(data.atividades, capitulo, atividadesInput))
      .catch(() => {
        showToast("Erro", "Erro ao carregar gabarito", "error");
      });
  }

  function processarAtividades(atividadesGabarito, capitulo, atividadesInput) {
    const linhas = atividadesInput.split("\n").map(l => l.trim()).filter(Boolean);

    const atividadesUsuario = [];
    for (let i = 0; i < linhas.length; i += 2) {
      const nome = linhas[i];
      const data = linhas[i + 1];

      if (!nome || !data || !isDataValida(data)) continue;

      atividadesUsuario.push({
        nomeOriginal: nome,
        nomeNormalizado: normalizarTexto(nome),
        data
      });
    }

    const resultado = [];
    const usadas = new Set();

    atividadesUsuario.forEach((usuario) => {
      const match = encontrarMelhorMatch(atividadesGabarito, usuario.nomeNormalizado);

      const atividadesLivres = [
        "eleicao",
        "cerimonia publica",
        "instalacao",
        "investidura",
        "convocacao",
        "administrativa"
      ];

      if (!match) {
        if (atividadesLivres.includes(usuario.nomeNormalizado)) {
          resultado.push({
            status: "ok",
            atividade: usuario.nomeOriginal,
            data: usuario.data,
            mensagem: "atividade registrada."
          });
          return;
        }

        resultado.push({
          status: "erro",
          atividade: usuario.nomeOriginal,
          mensagem: "atividade não existe no gabarito."
        });
        return;
      }

      const atividadesMultiplas = [
        "ritualistica grau iniciatico",
        "ritualistica grau demolay"
      ];

      const nomeNormalizadoMatch = normalizarTexto(match.nome);

      if (!atividadesMultiplas.includes(nomeNormalizadoMatch)) {
        if (usadas.has(match.nome)) {
          resultado.push({
            status: "erro",
            atividade: match.nome,
            mensagem: "atividade duplicada."
          });
          return;
        }

        usadas.add(match.nome);
      }

      usadas.add(match.nome);

      const validacao = validarAtividade(match, usuario.data);
      resultado.push(validacao);
    });

    atividadesGabarito.forEach((atividade) => {
      if (!usadas.has(atividade.nome)) {
        resultado.push({
          status: "erro",
          atividade: atividade.nome,
          mensagem: "não foi informada."
        });
      }
    });

    exibirResultado(capitulo, resultado);
  }

  function encontrarMelhorMatch(atividades, nomeUsuario) {
    let melhor = null;
    let maiorScore = 0;

    atividades.forEach((atividade) => {
      const nomeGabarito = normalizarTexto(atividade.nome);
      const score = similaridade(nomeUsuario, nomeGabarito);

      if (score > maiorScore) {
        maiorScore = score;
        melhor = atividade;
      }
    });

    return maiorScore >= 0.75 ? melhor : null;
  }

  function validarAtividade(atividade, dataUsuarioStr) {
    const dataUsuario = parseData(dataUsuarioStr);
    const dataGabarito = parseData(atividade.data);

    const erros = [];

    if (!dataUsuario || !dataGabarito) {
      return {
        status: "erro",
        atividade: atividade.nome,
        mensagem: "data inválida."
      };
    }

    if (atividade.mes_obrigatorio) {
      const mesUsuario = String(dataUsuario.getMonth() + 1).padStart(2, "0");
      if (mesUsuario !== atividade.mes_obrigatorio) {
        erros.push(`mês obrigatório ${atividade.mes_obrigatorio}`);
      }
    }

    if (atividade.validacao) {
      if (atividade.nome.toLowerCase() === "comissões permanentes") {
        const limite = new Date(2026, 7, 31);
        if (dataUsuario > limite) {
          erros.push("prazo máximo 31/08/2026");
        }
      } else {
        const limite = new Date(2026, 11, 20);
        if (dataUsuario > limite) {
          erros.push("prazo máximo 20/12/2026");
        }
      }
    }

    if (erros.length === 0) {
      return {
        status: "ok",
        atividade: atividade.nome,
        data: dataUsuarioStr,
        mensagem: "está correta."
      };
    }

    return {
      status: "erro",
      atividade: atividade.nome,
      mensagem: erros.join(" e ") + "."
    };
  }

  function normalizarTexto(texto) {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function similaridade(a, b) {
    if (a === b) return 1;
    const distancia = levenshtein(a, b);
    const max = Math.max(a.length, b.length);
    return 1 - distancia / max;
  }

  function levenshtein(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  function isDataValida(data) {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!regex.test(data)) return false;

    const [dia, mes, ano] = data.split("/").map(Number);
    const date = new Date(ano, mes - 1, dia);

    return date.getFullYear() === ano && date.getMonth() === mes - 1 && date.getDate() === dia;
  }

  function parseData(data) {
    if (!isDataValida(data)) return null;
    const [dia, mes, ano] = data.split("/").map(Number);
    return new Date(ano, mes - 1, dia);
  }

  function exibirResultado(capitulo, resultado) {
    const capituloNormalizado = normalizarTexto(capitulo);
    const temPriorado = capituloNormalizado.includes("priorado");
    const titulo = temPriorado ? capitulo : `Priorado: ${capitulo}`;

    // Texto para cópia
    const textoCopia = [
      titulo,
      "",
      ...resultado.map(r => {
        if (r.status === "ok") {
          return `✔ ${r.atividade} (${r.data}) ${r.mensagem}`;
        } else {
          return `✖ ${r.atividade}: ${r.mensagem}`;
        }
      })
    ].join("\n");

    resultadoText.setAttribute("data-raw", textoCopia);

    // Renderização
    resultadoText.innerHTML = "";

    // Identificação
    const capituloHeader = document.createElement("div");
    capituloHeader.className = "mb-6 pb-4 border-b border-gray-800";
    capituloHeader.innerHTML = `
      <div class="flex items-center gap-2 text-gray-500 text-[10px] uppercase tracking-[0.2em] font-black">
        <i class="ph ph-hash"></i> Identificação
      </div>
      <div class="text-2xl font-black text-white mt-1 tracking-tight">${titulo}</div>
    `;
    resultadoText.appendChild(capituloHeader);

    // Resumo
    const numOk = resultado.filter(r => r.status === "ok").length;
    const numErro = resultado.length - numOk;

    const resumo = document.createElement("div");
    resumo.className = "grid grid-cols-2 gap-4 mb-8";
    resumo.innerHTML = `
      <div class="bg-green-500/5 border border-green-500/20 rounded-2xl p-5 text-center transition-all hover:bg-green-500/10 hover:border-green-500/40">
        <div class="text-green-400 text-3xl font-black mb-1">${numOk}</div>
        <div class="text-green-100/40 text-[10px] font-black uppercase tracking-widest">Atividades OK</div>
      </div>
      <div class="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 text-center transition-all hover:bg-red-500/10 hover:border-red-500/40">
        <div class="text-red-400 text-3xl font-black mb-1">${numErro}</div>
        <div class="text-red-100/40 text-[10px] font-black uppercase tracking-widest">Pendentes</div>
      </div>
    `;
    resultadoText.appendChild(resumo);

    // Lista
    const conteinerResultados = document.createElement("div");
    conteinerResultados.className = "space-y-4";

    resultado.forEach(r => {
      const isOk = r.status === "ok";
      const item = document.createElement("div");

      item.className = `group flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] shadow-sm ${isOk
        ? "bg-green-500/5 border-green-500/10 hover:border-green-500/30 hover:shadow-green-500/5"
        : "bg-red-500/5 border-red-500/10 hover:border-red-500/30 hover:shadow-red-500/5"
        }`;

      const icon = isOk ? "ph-check-circle" : "ph-warning-circle";
      const color = isOk ? "green" : "red";

      item.innerHTML = `
        <div class="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-${color}-500/10 transition-transform group-hover:scale-110">
          <i class="ph ${icon} text-${color}-400 text-2xl"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="font-bold text-sm sm:text-lg truncate text-${color}-100">
              ${r.atividade}
            </h3>
            <span class="text-[9px] font-black px-2 py-0.5 rounded-full bg-${color}-500/20 text-${color}-400 uppercase tracking-wider">
              ${isOk ? 'Validado' : 'Ajustar'}
            </span>
          </div>
          <p class="text-xs sm:text-sm text-gray-400/80 font-medium leading-relaxed">
            ${isOk ? `<span class="text-${color}-300/60">Data: ${r.data}</span> • ` : ""}${r.mensagem}
          </p>
        </div>
      `;
      conteinerResultados.appendChild(item);
    });

    resultadoText.appendChild(conteinerResultados);
    resultadoDiv.classList.remove("hidden");

    setTimeout(() => {
      resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  function handleCopyButtonClick() {
    const texto = resultadoText.getAttribute("data-raw") || resultadoText.innerText;

    navigator.clipboard.writeText(texto).then(() => {
      playNotificationSound();
      showToast("Sucesso", "Resultado copiado para a área de transferência");
    }).catch(() => {
      showToast("Erro", "Falha ao copiar", "error");
    });
  }

  function playNotificationSound() {
    try {
      const audio = new Audio("assets/notify.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => { });
    } catch { }
  }

  function showToast(title, message, type = "success") {
    const existing = document.querySelector(".toast-notification");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "toast-notification";

    const icon = type === "success"
      ? '<i class="ph ph-check-circle"></i>'
      : '<i class="ph ph-warning-circle"></i>';

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <div class="toast-progress"></div>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
      toast.classList.add("hide");
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
});