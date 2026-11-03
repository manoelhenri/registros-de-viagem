// Pães do Manoel (/receitas). O HTML já vem pronto do gerador; aqui só ligamos e desligamos
// estados (nada é montado com texto concatenado em HTML).
(function () {
  var doc = document.documentElement;
  doc.classList.remove("no-js");
  doc.classList.add("js");

  function ler(chave, padrao) { try { var v = localStorage.getItem(chave); return v === null ? padrao : JSON.parse(v); } catch (e) { return padrao; } }
  function gravar(chave, valor) { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) {} }
  function $all(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }

  // ---------- voltar ao topo: aparece depois de rolar mais ou menos uma tela e meia ----------
  // Lê a posição de qualquer um dos contêineres (alguns navegadores rolam o body, não a janela)
  // e, se a rolagem suave for interrompida ou não existir, termina com um salto direto.
  var topo = document.querySelector("[data-topo]");
  if (topo) {
    var alvoRolagem = document.scrollingElement || document.documentElement;
    var posicao = function () { return Math.max(window.pageYOffset || 0, alvoRolagem.scrollTop || 0, document.body.scrollTop || 0); };
    var agendado = false;
    var conferir = function () { agendado = false; topo.hidden = posicao() < Math.max(700, window.innerHeight * 1.5); };
    var aoRolar = function () { if (!agendado) { agendado = true; requestAnimationFrame(conferir); } };
    document.addEventListener("scroll", aoRolar, { passive: true, capture: true });
    window.addEventListener("resize", aoRolar, { passive: true });
    conferir();
    // salto sem animação, ignorando o scroll-behavior:smooth do CSS
    var saltar = function (y) {
      var html = document.documentElement, antes = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, y); alvoRolagem.scrollTop = y; if (y === 0) document.body.scrollTop = 0;
      html.style.scrollBehavior = antes;
    };
    var irAoTopo = function (ev) {
      ev.preventDefault();
      var suave = !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      if (!suave) { saltar(0); } else {
        // página longa: pula para perto do topo e anima só o último trecho (rápido e sem travar)
        var perto = Math.round(window.innerHeight * 1.2);
        if (posicao() > perto) saltar(perto);
        try { window.scrollTo({ top: 0, left: 0, behavior: "smooth" }); } catch (e) { saltar(0); }
      }
      setTimeout(function () {
        if (posicao() > 2) saltar(0);
        if (ev.detail === 0) { var marca = document.querySelector(".brand"); if (marca) marca.focus(); }
        conferir();
      }, suave ? 700 : 30);
    };
    topo.addEventListener("click", irAoTopo);
  }

  // ---------- copiar texto ----------
  // Tenta a área de transferência; se o navegador negar (comum nos navegadores de dentro do
  // Instagram, Facebook e de alguns apps), tenta o jeito antigo e, se ainda falhar, mostra o
  // texto pronto para a pessoa copiar com o dedo.
  function copiaAntiga(texto) {
    var area = document.createElement("textarea");
    area.value = texto; area.setAttribute("readonly", "");
    area.style.position = "fixed"; area.style.top = "0"; area.style.left = "0"; area.style.opacity = "0"; area.style.fontSize = "16px";
    document.body.appendChild(area);
    var ok = false;
    try { area.focus(); area.select(); area.setSelectionRange(0, texto.length); ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(area);
    return ok;
  }
  function copiarTexto(texto, caixaId, aoCopiar) {
    var caixa = caixaId && document.getElementById(caixaId);
    if (caixa) caixa.hidden = true;
    var falhou = function () {
      if (copiaAntiga(texto)) { aoCopiar(); return; }
      if (!caixa) return;
      var campo = caixa.querySelector("textarea");
      campo.value = texto; caixa.hidden = false;
      try { campo.focus(); campo.select(); campo.setSelectionRange(0, texto.length); } catch (e) {}
    };
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext !== false) {
      try { navigator.clipboard.writeText(texto).then(aoCopiar, falhou); } catch (e) { falhou(); }
    } else falhou();
  }
  function avisar(botao, texto, original) {
    var l = botao.querySelector(".lbl"); if (!l) return;
    l.textContent = texto; botao.classList.add("feito");
    setTimeout(function () { l.textContent = original; botao.classList.remove("feito"); }, 2200);
  }

  // ---------- receitas salvas ----------
  var salvas = ler("receitas-salvas", []);
  function atualizarSalvas() {
    $all("[data-save]").forEach(function (b) {
      var on = salvas.indexOf(b.getAttribute("data-save")) >= 0;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      var t = b.querySelector(".lbl");
      if (t) t.textContent = on ? "Salva" : "Salvar";
      if (b.hasAttribute("aria-label")) b.setAttribute("aria-label", (on ? "Remover das salvas: " : "Salvar: ") + b.getAttribute("data-titulo"));
    });
    $all("[data-salvas-count]").forEach(function (el) { el.textContent = salvas.length ? String(salvas.length) : ""; });
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest("[data-save]");
    if (!b) return;
    ev.preventDefault();
    var s = b.getAttribute("data-save"), i = salvas.indexOf(s);
    if (i >= 0) salvas.splice(i, 1); else salvas.push(s);
    gravar("receitas-salvas", salvas);
    atualizarSalvas();
    if (typeof aplicar === "function") aplicar();
  });
  atualizarSalvas();

  // ---------- página da receita ----------
  var ingBox = document.querySelector("[data-ing]");
  if (ingBox) {
    var slug = ingBox.getAttribute("data-ing");
    // tamanho do pão
    var botoesTam = $all(".sizes button");
    function tamanho(i) {
      $all(".q", ingBox).forEach(function (q) { q.classList.toggle("on", q.getAttribute("data-col") === String(i)); });
      botoesTam.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-col") === String(i) ? "true" : "false"); });
      gravar("receitas-tamanho", String(i));
      var ativo = botoesTam.filter(function (b) { return b.getAttribute("data-col") === String(i); })[0];
      $all("[data-tam-label]").forEach(function (el) { if (ativo) el.textContent = " · " + ativo.textContent; });
    }
    if (botoesTam.length) {
      var t = ler("receitas-tamanho", "1");
      tamanho(t === "0" || t === "1" || t === "2" ? t : "1");
      botoesTam.forEach(function (b) { b.addEventListener("click", function () { tamanho(b.getAttribute("data-col")); }); });
    }
    // marcar ingredientes e passos (lembrado por receita, durante o dia)
    var chave = "receitas-marcas-" + slug;
    var marcas = ler(chave, { d: "", i: [], p: [] });
    var hoje = new Date().toDateString();
    if (marcas.d !== hoje) marcas = { d: hoje, i: [], p: [] };
    function ligar(sel, lista) {
      $all(sel).forEach(function (b, idx) {
        if (marcas[lista].indexOf(idx) >= 0) b.setAttribute("aria-pressed", "true");
        b.addEventListener("click", function () {
          var on = b.getAttribute("aria-pressed") !== "true";
          b.setAttribute("aria-pressed", on ? "true" : "false");
          var arr = marcas[lista], k = arr.indexOf(idx);
          if (on && k < 0) arr.push(idx); if (!on && k >= 0) arr.splice(k, 1);
          gravar(chave, marcas);
          if (lista === "p") passoAtual();
          verLimpar();
        });
      });
    }
    ligar(".ing button", "i");
    ligar(".steps button", "p");
    var limpar = document.getElementById("limpar-marcas");
    function verLimpar() { if (limpar) limpar.hidden = !(marcas.i.length || marcas.p.length); }
    verLimpar();
    if (limpar) limpar.addEventListener("click", function () {
      marcas = { d: hoje, i: [], p: [] }; gravar(chave, marcas);
      $all(".ing button, .steps button").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      passoAtual(); verLimpar();
    });
    var pos = document.getElementById("passo-pos");
    function passoAtual() {
      var lis = $all(".steps:not(.plain) li"), atual = -1; lis.forEach(function (li) { li.classList.remove("now"); });
      for (var i = 0; i < lis.length; i++) { if (lis[i].querySelector("button").getAttribute("aria-pressed") !== "true") { lis[i].classList.add("now"); atual = i; break; } }
      if (pos) pos.textContent = atual < 0 ? "Tudo pronto!" : "Passo " + (atual + 1) + " de " + lis.length;
      return atual;
    }
    function verPasso(li) {
      if (!li) return;
      var r = li.getBoundingClientRect(), alvo = window.pageYOffset + r.top - window.innerHeight * 0.3;
      window.scrollTo({ top: Math.max(0, alvo), behavior: "smooth" });
    }
    var bOk = document.getElementById("passo-ok"), bAnt = document.getElementById("passo-ant");
    if (bOk) bOk.addEventListener("click", function () {
      var lis = $all(".steps:not(.plain) li"), i = passoAtual();
      if (i < 0) return;
      lis[i].querySelector("button").click();
      verPasso(lis[passoAtual()] || lis[lis.length - 1]);
    });
    if (bAnt) bAnt.addEventListener("click", function () {
      var lis = $all(".steps:not(.plain) li"), i = passoAtual(), alvo = (i < 0 ? lis.length : i) - 1;
      if (alvo < 0) { verPasso(lis[0]); return; }
      var b = lis[alvo].querySelector("button"); if (b.getAttribute("aria-pressed") === "true") b.click();
      verPasso(lis[alvo]);
    });

    // copiar a lista de ingredientes no tamanho escolhido (para mandar ou guardar)
    var copiar = document.getElementById("copiar-ing");
    if (copiar) copiar.addEventListener("click", function () {
      var linhas = [document.querySelector("h1").textContent.trim()];
      var ativo = document.querySelector(".sizes [aria-pressed=true]");
      if (ativo) linhas[0] += " (" + ativo.textContent.trim() + ")";
      $all("#ingredientes .ing-g, #ingredientes .ing li").forEach(function (el) {
        if (el.classList.contains("ing-g")) { linhas.push("", el.textContent.trim() + ":"); return; }
        var q = el.querySelector(".q.on") || el.querySelector(".q"), n = el.querySelector(".nm");
        linhas.push("- " + (q ? q.textContent.trim() + " " : "") + (n ? n.textContent.trim() : ""));
      });
      linhas.push("", location.href.split("#")[0]);
      copiarTexto(linhas.join("\n"), "copia-ing", function () { avisar(copiar, "Lista copiada", "Copiar ingredientes"); });
    });
    passoAtual();

    // modo cozinha: tela acesa e letras maiores
    var lock = null, cozinha = document.getElementById("modo-cozinha"), sair = document.getElementById("sair-cozinha");
    var ckCurto = document.querySelector("[data-ck-short]"), ckLongo = document.querySelector("[data-ck-long]");
    function telaAcesa(sim) {
      if (ckCurto) ckCurto.textContent = sim ? ": tela acesa" : ": letras maiores";
      if (ckLongo) ckLongo.textContent = sim ? " ligado: a tela fica acesa. Toque nos ingredientes e passos para marcar." : " ligado: letras maiores e um passo por vez. Este navegador não deixa manter a tela acesa; se ela apagar, é só tocar.";
    }
    function pedirTela() {
      if (!navigator.wakeLock || typeof navigator.wakeLock.request !== "function") { telaAcesa(false); return; }
      navigator.wakeLock.request("screen").then(function (l) {
        lock = l; telaAcesa(true);
        l.addEventListener && l.addEventListener("release", function () { if (lock === l) { lock = null; if (document.visibilityState === "visible") telaAcesa(false); } });
      }).catch(function () { telaAcesa(false); });
    }
    function setCozinha(on) {
      doc.classList.toggle("cooking", on);
      if (cozinha) cozinha.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) pedirTela();
      else if (lock) { var l = lock; lock = null; l.release().catch(function () {}); }
    }
    if (cozinha) cozinha.addEventListener("click", function () { setCozinha(!doc.classList.contains("cooking")); });
    if (sair) sair.addEventListener("click", function () { setCozinha(false); });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && doc.classList.contains("cooking") && !lock) pedirTela();
    });

    // barra "Ingredientes / Modo de preparo" (celular): marca a seção que está na tela
    var saltos = $all("[data-jump]");
    if (saltos.length && "IntersectionObserver" in window) {
      var obs = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) {
          if (!e.isIntersecting) return;
          saltos.forEach(function (a) { if (a.getAttribute("data-jump") === e.target.id) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      saltos.forEach(function (a) { var alvo = document.getElementById(a.getAttribute("data-jump")); if (alvo) obs.observe(alvo); });
    }

    var imprimir = document.getElementById("imprimir");
    if (imprimir && (typeof window.print !== "function" || /FBAN|FBAV|Instagram|Line\/|; wv\)|WhatsApp|TikTok|musical_ly|Snapchat|Pinterest|Twitter/i.test(navigator.userAgent))) imprimir.hidden = true;
    if (imprimir) imprimir.addEventListener("click", function () { window.print(); });
    var compartilhar = document.getElementById("compartilhar");
    if (compartilhar) compartilhar.addEventListener("click", function () {
      var url = location.href.split("#")[0];
      var copiarLink = function () { copiarTexto(url, "copia-link", function () { avisar(compartilhar, "Link copiado", "Compartilhar"); }); };
      if (navigator.share) {
        navigator.share({ title: document.title, url: url }).catch(function (e) { if (!e || e.name !== "AbortError") copiarLink(); });
        return;
      }
      copiarLink();
    });
  }

  // ---------- home: busca e filtros ----------
  var lista = document.getElementById("todas");
  var aplicar = null;
  if (!lista) return;
  var busca = document.getElementById("busca");
  var cards = $all(".rc", lista);
  var contador = document.getElementById("contador");
  var vazio = document.getElementById("vazio");
  var secao = document.getElementById("receitas");
  var selTag = document.getElementById("f-tag");
  function novoEstado() { return { q: "", cat: "", tag: "", timer: false, salvas: false, facil: false, oficial: false }; }
  var ordemOriginal = cards.slice();
  var parcial = document.getElementById("parcial");
  var estado = novoEstado();

  // valores aceitos (um endereço antigo ou digitado errado não deixa a lista vazia)
  var catsValidas = $all(".chips-scroll [data-f-cat]").map(function (b) { return b.getAttribute("data-f-cat"); }).filter(Boolean);
  var tagsValidas = selTag ? $all("option", selTag).map(function (o) { return o.value; }).filter(Boolean) : [];

  function norm(t) { return (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  // aceita plural e singular: "queijos" acha "queijo", "goiabadas" acha "goiabada"
  function casa(texto, t) {
    if (texto.indexOf(t) >= 0) return true;
    if (t.length > 3 && /s$/.test(t)) {
      var sem = t.replace(/(oes|aes|es|s)$/, function (m) { return m === "oes" ? "ao" : m === "aes" ? "ao" : m === "es" ? "e" : ""; });
      if (texto.indexOf(sem) >= 0) return true;
      if (texto.indexOf(t.slice(0, -1)) >= 0) return true;
    }
    return false;
  }
  function marcar(sel, attr, valor) { $all(sel).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute(attr) === valor ? "true" : "false"); }); }
  function irParaLista() { var alvo = secao.querySelector(".filters") || secao; alvo.scrollIntoView({ block: "start" }); }
  function filtrando() { return !!(estado.q.trim() || estado.cat || estado.tag || estado.timer || estado.salvas || estado.facil || estado.oficial); }

  aplicar = function () {
    var q = norm(estado.q.trim()), n = 0;
    var termos = q ? q.split(/\s+/).filter(function (t) { return t.length > 1 || /\d/.test(t); }) : [];
    var passa = function (c) {
      return (!estado.cat || c.getAttribute("data-cat") === estado.cat) &&
        (!estado.tag || c.getAttribute("data-tags").split("|").indexOf(estado.tag) >= 0) &&
        (!estado.timer || c.getAttribute("data-timer") === "1") &&
        (!estado.facil || c.getAttribute("data-nivel") === "facil") &&
        (!estado.oficial || c.getAttribute("data-origem") === "oficial") &&
        (!estado.salvas || salvas.indexOf(c.getAttribute("data-slug")) >= 0);
    };
    var nota = {};
    cards.forEach(function (c) {
      var texto = c.getAttribute("data-busca");
      var ok = passa(c) && termos.every(function (t) { return casa(texto, t); });
      c.hidden = !ok; if (ok) n++;
    });
    // "o que tenho em casa": com 2 ou mais palavras e nenhuma receita com todas,
    // mostra as que têm parte delas, das que mais combinam para as que menos combinam
    var modoParcial = false;
    if (n === 0 && termos.length >= 2) {
      cards.forEach(function (c) {
        if (!passa(c)) return;
        var texto = c.getAttribute("data-busca"), k = 0;
        termos.forEach(function (t) { if (casa(texto, t)) k++; });
        if (k > 0) { nota[c.getAttribute("data-slug")] = k; c.hidden = false; n++; }
      });
      modoParcial = n > 0;
    }
    var ordem = ordemOriginal.slice();
    if (modoParcial) ordem.sort(function (a, b) { return (nota[b.getAttribute("data-slug")] || 0) - (nota[a.getAttribute("data-slug")] || 0); });
    ordem.forEach(function (c) { lista.appendChild(c); });
    if (parcial) parcial.hidden = !modoParcial;
    contador.textContent = n === 1 ? "1 receita" : n + " receitas";
    vazio.hidden = n !== 0;
    var semSalvas = estado.salvas && !salvas.length;
    $all("[data-vazio]", vazio).forEach(function (el) { el.hidden = (el.getAttribute("data-vazio") === "salvas") !== semSalvas; });
    $all(".result-line [data-limpar]").forEach(function (b) { b.hidden = !filtrando(); });
    marcar(".chips-scroll [data-f-cat]", "data-f-cat", estado.cat);
    $all("button[data-f-timer]").forEach(function (b) { b.setAttribute("aria-pressed", estado.timer ? "true" : "false"); });
    $all("button[data-f-salvas]").forEach(function (b) { b.setAttribute("aria-pressed", estado.salvas ? "true" : "false"); });
    $all("button[data-f-facil]").forEach(function (b) { b.setAttribute("aria-pressed", estado.facil ? "true" : "false"); });
    $all("button[data-f-oficial]").forEach(function (b) { b.setAttribute("aria-pressed", estado.oficial ? "true" : "false"); });
    if (selTag) { selTag.value = estado.tag; selTag.classList.toggle("on", !!estado.tag); }
    if (busca.value !== estado.q) busca.value = estado.q;
    // deixa a categoria escolhida visível na faixa que rola para o lado
    var chipAtivo = document.querySelector(".chips-scroll [aria-pressed=true]");
    if (chipAtivo) { var faixa = chipAtivo.parentNode; var x = chipAtivo.offsetLeft - (faixa.clientWidth - chipAtivo.offsetWidth) / 2; faixa.scrollLeft = Math.max(0, x); }
    var p = new URLSearchParams();
    if (estado.q.trim()) p.set("q", estado.q.trim()); if (estado.cat) p.set("categoria", estado.cat); if (estado.tag) p.set("tag", estado.tag);
    if (estado.timer) p.set("timer", "1"); if (estado.facil) p.set("nivel", "facil"); if (estado.oficial) p.set("origem", "oficial"); if (estado.salvas) p.set("salvas", "1");
    var qs = p.toString();
    try { history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + (qs ? "#receitas" : "")); } catch (e) {}
  };

  // atalhos (links da abertura, categorias, "Ver as 9", menu de salvas): começam do zero
  // e aplicam só o filtro do atalho, para nunca somar com um filtro antigo e zerar a lista.
  $all("a[data-f-cat], a[data-f-tag], a[data-f-timer], a[data-f-salvas]").forEach(function (a) {
    a.addEventListener("click", function (ev) {
      ev.preventDefault();
      estado = novoEstado();
      if (a.hasAttribute("data-f-cat")) estado.cat = a.getAttribute("data-f-cat");
      if (a.hasAttribute("data-f-tag")) estado.tag = a.getAttribute("data-f-tag");
      if (a.hasAttribute("data-f-timer")) estado.timer = true;
      if (a.hasAttribute("data-f-salvas")) estado.salvas = true;
      aplicar(); irParaLista();
    });
  });

  // controles da própria lista: combinam entre si
  var espera = null;
  busca.addEventListener("input", function () { estado.q = busca.value; clearTimeout(espera); espera = setTimeout(aplicar, 120); });
  busca.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); busca.blur(); } });
  $all(".chips-scroll [data-f-cat]").forEach(function (b) {
    b.addEventListener("click", function () {
      var v = b.getAttribute("data-f-cat");
      estado.cat = (estado.cat === v) ? "" : v;
      aplicar();
    });
  });
  $all("button[data-f-timer]").forEach(function (b) { b.addEventListener("click", function () { estado.timer = !estado.timer; aplicar(); }); });
  $all("button[data-f-salvas]").forEach(function (b) { b.addEventListener("click", function () { estado.salvas = !estado.salvas; aplicar(); }); });
  $all("button[data-f-facil]").forEach(function (b) { b.addEventListener("click", function () { estado.facil = !estado.facil; aplicar(); }); });
  $all("button[data-f-oficial]").forEach(function (b) { b.addEventListener("click", function () { estado.oficial = !estado.oficial; aplicar(); }); });
  if (selTag) selTag.addEventListener("change", function () { estado.tag = selTag.value; aplicar(); });
  $all("[data-limpar]").forEach(function (b) { b.addEventListener("click", function () {
    estado = novoEstado(); aplicar(); irParaLista();
  }); });

  // busca da abertura: leva para a lista já filtrada (sem somar com filtros antigos)
  var form = document.getElementById("busca-topo");
  if (form) form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var campo = form.querySelector("input");
    estado = novoEstado(); estado.q = campo.value; campo.blur();
    aplicar(); irParaLista();
  });

  // estado inicial vindo do endereço (links da página da receita, compartilhados ou voltar)
  var p = new URLSearchParams(location.search);
  estado.q = p.get("q") || "";
  estado.cat = catsValidas.indexOf(p.get("categoria")) >= 0 ? p.get("categoria") : "";
  estado.tag = tagsValidas.indexOf(p.get("tag")) >= 0 ? p.get("tag") : "";
  estado.timer = p.get("timer") === "1"; estado.salvas = p.get("salvas") === "1"; estado.facil = p.get("nivel") === "facil"; estado.oficial = p.get("origem") === "oficial";
  aplicar();
  var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  var voltando = nav && nav.type === "back_forward";
  if (filtrando() && !voltando) requestAnimationFrame(irParaLista);
})();
