/* QOM Defender — demo estática (sin appliance).
 * Intercepta fetch/XHR a /api/* y responde con fixtures + stubs.
 * Cargar ANTES que el resto de la consola.
 */
(function () {
  "use strict";
  if (window.__QOM_STATIC_DEMO__) return;
  window.__QOM_STATIC_DEMO__ = true;

  const DEMO_SESSION =
    "demo.static.qomdefender.0.0000000000000000000000000000000000000000000000000000000000000000";

  const FIX = {
    ops: null,
    health: null,
    loginGet: null,
  };

  async function loadFixtures() {
    const base = document.currentScript
      ? new URL(".", document.currentScript.src).href
      : "./";
    const [ops, health, loginGet] = await Promise.all([
      fetch(base + "fixtures/ops.json").then((r) => r.json()).catch(() => ({})),
      fetch(base + "fixtures/health.json").then((r) => r.json()).catch(() => ({})),
      fetch(base + "fixtures/login-get.json").then((r) => r.json()).catch(() => ({
        required: true,
        mode: "token+directory",
        users: 1,
      })),
    ]);
    FIX.ops = ops;
    FIX.health = Object.assign({ product: "QOM Defender", version: "0.1.0", status: "ok" }, health, {
      login_required: false,
      demo_static: true,
    });
    FIX.loginGet = loginGet;
  }

  function banner() {
    if (document.getElementById("qom-demo-banner")) return;
    const b = document.createElement("div");
    b.id = "qom-demo-banner";
    b.setAttribute("role", "status");
    b.textContent =
      "Demo estática — vitrina de la consola. No hay appliance detrás; las acciones no ejecutan nada real.";
    Object.assign(b.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      zIndex: "99999",
      background: "#1a3a4a",
      color: "#c8e8f5",
      font: "600 12px/1.4 system-ui,sans-serif",
      padding: "6px 12px",
      textAlign: "center",
      borderBottom: "1px solid #2a5a6a",
    });
    document.documentElement.style.scrollPaddingTop = "32px";
    const mount = () => {
      if (!document.body) return;
      document.body.prepend(b);
      document.body.style.paddingTop = "32px";
    };
    if (document.body) mount();
    else document.addEventListener("DOMContentLoaded", mount);
  }

  function pathOf(input) {
    try {
      const u = typeof input === "string" ? new URL(input, location.href) : new URL(input.url, location.href);
      return u.pathname + u.search;
    } catch (_) {
      return String(input || "");
    }
  }

  function jsonResponse(obj, status) {
    return new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: { "Content-Type": "application/json", "X-QOM-Demo": "static" },
    });
  }

  function stubFor(path, method) {
    const p = path.split("?")[0];
    const m = (method || "GET").toUpperCase();

    if (p === "/api/login" && m === "GET") {
      return jsonResponse(
        Object.assign({}, FIX.loginGet || {}, {
          required: false,
          demo_static: true,
          note: "demo estática — login omitido",
        })
      );
    }
    if (p === "/api/login" && m === "POST") {
      return jsonResponse({
        required: false,
        session: DEMO_SESSION,
        user: "demo",
        role: "admin",
        expires: Math.floor(Date.now() / 1000) + 86400 * 365,
      });
    }
    if (p === "/api/ops" || p === "/api/v1/ops") {
      return jsonResponse(FIX.ops || { events: 0, alerts: 0, latest_alerts: [], latest_events: [] });
    }
    if (p === "/api/health" || p === "/api/v1/health") {
      return jsonResponse(FIX.health || { product: "QOM Defender", status: "ok", demo_static: true });
    }
    if (p.indexOf("/api/v1/alerts/") === 0 && p.indexOf("/narrative") > 0 && m === "GET") {
      return jsonResponse({
        generated_by: "template",
        fallback_used: true,
        model: "demo-static",
        narrative: {
          headline: "Alerta de demostración",
          what_happened:
            "Esto es una vitrina estática: el evento se muestra para recorrer la interfaz, no proviene de un sensor real.",
          why_it_matters:
            "Sirve para que un visitante vea cómo se lee una alerta en lenguaje común dentro de QOM Defender.",
          what_to_do: [
            "Recorrer Live y los menús BLUE / RED / Infraestructura.",
            "En un appliance real, la N consulta el motor y opcionalmente el LLM local.",
          ],
        },
      });
    }
    if (p === "/api/v1/alerts/narrative" && m === "POST") {
      return jsonResponse({
        generated_by: "template",
        fallback_used: true,
        model: "demo-static",
        narrative: {
          headline: "Evento de demostración",
          what_happened:
            "Página web de muestra: la narrativa aparece para enseñar el diálogo «N», sin analizar tráfico real.",
          why_it_matters: "Permite ver el flujo de explicación sin appliance ni Ollama.",
          what_to_do: ["Seguir explorando la consola demo.", "Pedir una demo en vivo del appliance real."],
        },
      });
    }

    // Catch-all: formas inocuas para que la UI no se rompa
    if (p.indexOf("/api/") === 0) {
      if (m === "GET") {
        return jsonResponse({
          ok: true,
          demo_static: true,
          note: "stub GET " + p,
          items: [],
          status: "demo",
          enabled: false,
          count: 0,
        });
      }
      return jsonResponse({
        ok: true,
        demo_static: true,
        note: "acción no ejecutada (demo estática)",
        state: "noop",
      });
    }
    return null;
  }

  const ready = loadFixtures().then(() => {
    try {
      sessionStorage.setItem("qom_session", DEMO_SESSION);
      document.cookie = "qom_session=" + DEMO_SESSION + "; path=/; SameSite=Lax";
    } catch (_) {}
    banner();
    // Quitar gate si ya está en el DOM
    const hideGate = () => {
      const g = document.getElementById("gate");
      if (g) g.classList.remove("on");
    };
    hideGate();
    document.addEventListener("DOMContentLoaded", hideGate);
    setTimeout(hideGate, 50);
    setTimeout(hideGate, 500);
  });

  const origFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    await ready;
    const path = pathOf(input);
    const method = (init && init.method) || (input && input.method) || "GET";
    const mocked = stubFor(path, method);
    if (mocked) return mocked;
    return origFetch(input, init);
  };

  // XHR por si alguna página lo usa
  const OrigXHR = window.XMLHttpRequest;
  function DemoXHR() {
    const xhr = new OrigXHR();
    const open = xhr.open;
    xhr.open = function (method, url) {
      this.__qomMethod = method;
      this.__qomUrl = url;
      return open.apply(this, arguments);
    };
    const send = xhr.send;
    xhr.send = function (body) {
      const path = pathOf(this.__qomUrl || "");
      const mocked = stubFor(path, this.__qomMethod);
      if (!mocked) return send.apply(this, arguments);
      const self = this;
      ready.then(async () => {
        const text = await mocked.text();
        Object.defineProperty(self, "readyState", { value: 4 });
        Object.defineProperty(self, "status", { value: mocked.status });
        Object.defineProperty(self, "responseText", { value: text });
        Object.defineProperty(self, "response", { value: text });
        if (self.onreadystatechange) self.onreadystatechange();
        if (self.onload) self.onload();
      });
    };
    return xhr;
  }
  window.XMLHttpRequest = DemoXHR;
})();
