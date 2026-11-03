// Pães do Manoel: comportamento da área /receitas.
// Só liga e desliga elementos que já vêm prontos no HTML (nada é montado com texto concatenado).
(function () {
  document.documentElement.classList.add("js");

  // ---- página da receita: escolha do tamanho do pão ----
  var box = document.querySelector("[data-sel]");
  var botoes = document.querySelectorAll(".sizes button");
  function escolher(i) {
    if (!box) return;
    box.setAttribute("data-sel", String(i));
    box.querySelectorAll(".q").forEach(function (td) {
      td.classList.toggle("on", td.getAttribute("data-col") === String(i));
    });
    botoes.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-col") === String(i) ? "true" : "false"); });
    try { localStorage.setItem("receitas-tamanho", String(i)); } catch (e) {}
  }
  if (box && botoes.length) {
    var salvo = null;
    try { salvo = localStorage.getItem("receitas-tamanho"); } catch (e) {}
    escolher(salvo === "0" || salvo === "1" || salvo === "2" ? salvo : "1");
    botoes.forEach(function (b) { b.addEventListener("click", function () { escolher(b.getAttribute("data-col")); }); });
  }

  // ---- página inicial: busca e filtros ----
  var lista = document.getElementById("lista");
  if (!lista) return;
  var busca = document.getElementById("busca");
  var selCap = document.getElementById("f-capitulo");
  var selProg = document.getElementById("f-programa");
  var segVol = document.querySelectorAll("[data-vol]");
  var contador = document.getElementById("contador");
  var vazio = document.getElementById("vazio");
  var cards = Array.prototype.slice.call(lista.querySelectorAll(".rcard"));
  var capitulos = Array.prototype.slice.call(lista.querySelectorAll(".chapter"));
  var vol = "todos";

  function norm(t) { return (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }

  function aplicar() {
    var q = norm(busca.value.trim());
    var cap = selCap.value, prog = selProg.value, n = 0;
    cards.forEach(function (c) {
      var ok = (vol === "todos" || c.dataset.vol === vol) &&
        (!cap || c.dataset.cap === cap) &&
        (!prog || c.dataset.prog.split("|").indexOf(prog) >= 0) &&
        (!q || c.dataset.busca.indexOf(q) >= 0);
      c.hidden = !ok;
      if (ok) n++;
    });
    capitulos.forEach(function (s) { s.hidden = !s.querySelector(".rcard:not([hidden])"); });
    contador.textContent = n === 1 ? "1 receita" : n + " receitas";
    vazio.hidden = n !== 0;
  }
  busca.addEventListener("input", aplicar);
  selCap.addEventListener("change", aplicar);
  selProg.addEventListener("change", aplicar);
  segVol.forEach(function (b) {
    b.addEventListener("click", function () {
      vol = b.getAttribute("data-vol");
      segVol.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      aplicar();
    });
  });
  document.getElementById("limpar").addEventListener("click", function () {
    busca.value = ""; selCap.value = ""; selProg.value = ""; vol = "todos";
    segVol.forEach(function (x) { x.setAttribute("aria-pressed", x.getAttribute("data-vol") === "todos" ? "true" : "false"); });
    aplicar(); busca.focus();
  });
  var p = new URLSearchParams(location.search).get("q");
  if (p) { busca.value = p; }
  aplicar();
})();
