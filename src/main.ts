import { Application, Graphics } from "pixi.js";

const app = new Application();

async function init() {
  await app.init({ background: "#1a1a2e", resizeTo: window });
  document.body.appendChild(app.canvas);

  const gfx = new Graphics().circle(400, 300, 50).fill({ color: 0xe94560 });
  app.stage.addChild(gfx);
}

init();
