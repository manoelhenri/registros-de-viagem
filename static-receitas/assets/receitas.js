// Pães do Manoel (/receitas). O HTML já vem pronto do gerador; aqui só ligamos e desligamos
// estados (nada é montado com texto concatenado em HTML).
(function () {
  var doc = document.documentElement;
  doc.classList.remove("no-js");
  doc.classList.add("js");

  function ler(chave, padrao) { try { var v = localStorage.getItem(chave); return v === null ? padrao : JSON.parse(v); } catch (e) { return padrao; } }
  function gravar(chave, valor) { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) {} }
  function $all(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }

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
        });
      });
    }
    ligar(".ing button", "i");
    ligar(".steps button", "p");
    var limpar = document.getElementById("limpar-marcas");
    if (limpar) limpar.addEventListener("click", function () {
      marcas = { d: hoje, i: [], p: [] }; gravar(chave, marcas);
      $all(".ing button, .steps button").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      passoAtual();
    });
    function passoAtual() {
      var lis = $all(".steps li"); lis.forEach(function (li) { li.classList.remove("now"); });
      for (var i = 0; i < lis.length; i++) { if (lis[i].querySelector("button").getAttribute("aria-pressed") !== "true") { lis[i].classList.add("now"); break; } }
    }
    passoAtual();

    // modo cozinha: tela acesa e letras maiores
    var lock = null, cozinha = document.getElementById("modo-cozinha"), sair = document.getElementById("sair-cozinha");
    function setCozinha(on) {
      doc.classList.toggle("cooking", on);
      if (cozinha) cozinha.setAttribute("aria-pressed", on ? "true" : "false");
      if (on && "wakeLock" in navigator) {
        navigator.wakeLock.request("screen").then(function (l) { lock = l; }).catch(function () {});
      } else if (!on && lock) { lock.release().catch(function () {}); lock = null; }
    }
    if (cozinha) cozinha.addEventListener("click", function () { setCozinha(!doc.classList.contains("cooking")); });
    if (sair) sair.addEventListener("click", function () { setCozinha(false); });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && doc.classList.contains("cooking") && "wakeLock" in navigator) {
        navigator.wakeLock.request("screen").then(function (l) { lock = l; }).catch(function () {});
      }
    });

    var imprimir = document.getElementById("imprimir");
    if (imprimir) imprimir.addEventListener("click", function () { window.print(); });
    var compartilhar = document.getElementById("compartilhar");
    if (compartilhar) compartilhar.addEventListener("click", function () {
      var dados = { title: document.title, url: location.href };
      if (navigator.share) { navigator.share(dados).catch(function () {}); return; }
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () {
        var l = compartilhar.querySelector(".lbl"); if (l) { l.textContent = "Link copiado"; setTimeout(function () { l.textContent = "Compartilhar"; }, 2000); }
      });
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
  var estado = { q: "", cat: "", tag: "", timer: false, salvas: false };

  function norm(t) { return (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function marcar(sel, attr, valor) { $all(sel).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute(attr) === valor ? "true" : "false"); }); }

  aplicar = function () {
    var q = norm(estado.q.trim()), n = 0;
    var termos = q ? q.split(/\s+/) : [];
    cards.forEach(function (c) {
      var texto = c.getAttribute("data-busca");
      var ok = (!estado.cat || c.getAttribute("data-cat") === estado.cat) &&
        (!estado.tag || c.getAttribute("data-tags").split("|").indexOf(estado.tag) >= 0) &&
        (!estado.timer || c.getAttribute("data-timer") === "1") &&
        (!estado.salvas || salvas.indexOf(c.getAttribute("data-slug")) >= 0) &&
        termos.every(function (t) { return texto.indexOf(t) >= 0; });
      c.hidden = !ok; if (ok) n++;
    });
    contador.textContent = n === 1 ? "1 receita" : n + " receitas";
    vazio.hidden = n !== 0;
    marcar("[data-f-cat]", "data-f-cat", estado.cat);
    $all("[data-f-timer]").forEach(function (b) { b.setAttribute("aria-pressed", estado.timer ? "true" : "false"); });
    $all("[data-f-salvas]").forEach(function (b) { b.setAttribute("aria-pressed", estado.salvas ? "true" : "false"); });
    var sel = document.getElementById("f-tag"); if (sel) sel.value = estado.tag;
    var p = new URLSearchParams();
    if (estado.q) p.set("q", estado.q); if (estado.cat) p.set("categoria", estado.cat); if (estado.tag) p.set("tag", estado.tag);
    if (estado.timer) p.set("timer", "1"); if (estado.salvas) p.set("salvas", "1");
    var qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  };

  busca.addEventListener("input", function () { estado.q = busca.value; aplicar(); });
  $all("[data-f-cat]").forEach(function (b) {
    b.addEventListener("click", function (ev) {
      ev.preventDefault();
      var v = b.getAttribute("data-f-cat");
      estado.cat = (estado.cat === v && b.classList.contains("chip")) ? "" : v;
      aplicar();
      if (!b.classList.contains("chip")) document.getElementById("receitas").scrollIntoView();
    });
  });
  $all("[data-f-timer]").forEach(function (b) { b.addEventListener("click", function (ev) { ev.preventDefault(); estado.timer = b.tagName === "A" ? true : !estado.timer; aplicar(); if (b.tagName === "A") document.getElementById("receitas").scrollIntoView(); }); });
  $all("[data-f-salvas]").forEach(function (b) { b.addEventListener("click", function (ev) { ev.preventDefault(); estado.salvas = !estado.salvas || b.tagName === "A"; aplicar(); document.getElementById("receitas").scrollIntoView(); }); });
  var selTag = document.getElementById("f-tag");
  if (selTag) selTag.addEventListener("change", function () { estado.tag = selTag.value; aplicar(); });
  $all("[data-limpar]").forEach(function (b) { b.addEventListener("click", function () {
    estado = { q: "", cat: "", tag: "", timer: false, salvas: false }; busca.value = ""; aplicar(); busca.focus();
  }); });

  // busca do topo: leva para a lista já filtrada
  var form = document.getElementById("busca-topo");
  if (form) form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var v = form.querySelector("input").value;
    estado.q = v; busca.value = v; aplicar();
    document.getElementById("receitas").scrollIntoView();
  });

  // estado inicial vindo do endereço (links da página da receita e da home)
  var p = new URLSearchParams(location.search);
  estado.q = p.get("q") || ""; estado.cat = p.get("categoria") || ""; estado.tag = p.get("tag") || "";
  estado.timer = p.get("timer") === "1"; estado.salvas = p.get("salvas") === "1";
  busca.value = estado.q;
  aplicar();
  if (p.toString() && !location.hash) document.getElementById("receitas").scrollIntoView();
})();
