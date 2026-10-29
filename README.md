# QOM Defender — demo estática (vitrina web)

Páginas HTML del producto **sin appliance detrás**. Sirve para mostrar en Internet
cómo se ve y se navega la consola; los POST/acciones no hacen nada real.

## Probar en local

```bash
cd static-demo
python3 -m http.server 8765
# abrir http://127.0.0.1:8765/
```

## Publicar

Subí **toda** esta carpeta a:

- [Cloudflare Pages](https://pages.cloudflare.com/) / Netlify / GitHub Pages
- o cualquier hosting estático (nginx, S3+CloudFront, etc.)

Raíz del sitio = contenido de `static-demo/` (`index.html` en la raíz).

## Cómo funciona

- `mock-api.js` intercepta `/api/*` y responde con fixtures + stubs.
- Banner fijo: “Demo estática…”.
- Login omitido (sesión demo).

## Regenerar

```bash
bash scripts/export-static-demo.sh
```

(desde la raíz del repo; opcionalmente captura `/api/ops` del appliance lab).
