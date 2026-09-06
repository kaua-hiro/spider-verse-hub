# 🕷️ Aranha-Verso Hub

Tributo interativo ao multiverso do Homem-Aranha — site em HTML/CSS/JS puro, sem build step, com foco em micro-interações e um sistema visual próprio inspirado em quadrinhos.

> Projeto de fã, sem fins comerciais. Homem-Aranha e todos os personagens são marcas registradas da Marvel.

## ✨ Destaques

- **Dossiê em quadrinhos**: clique em qualquer figura ou simbionte para abrir um cartão modal estilo HQ, com bio, poderes, Terra de origem e número de edição.
- **Teias interativas nos cantos**: malha orbicular (raios + anéis) simulada com física de massa-mola por nó — presa no centro e na borda externa, livre nos anéis internos. Reage ao cursor com deformação local que se propaga pelos fios vizinhos, e balança sozinha com uma corrente de vento contínua (direção e rajadas que variam devagar).
- **Vitrine flutuante do Aranha-Verso**: grade de personagens com hover que amplia e ilumina, sobre um emblema aracnídeo de fundo.
- **Cultura Pop**: cards de filmes/jogos preenchidos por completo, mesmo crop e peso visual entre eles.
- **Faixa de onomatopeias** (THWIP! POW! SNAP!...) em loop matematicamente contínuo, sem emenda visível.
- Totalmente responsivo (4 → 3 → 2 colunas) e acessível: `prefers-reduced-motion` desativa transições/zooms, foco visível em todos os elementos interativos, `aria-label`/`role="dialog"` no modal.

## 🛠️ Stack

Sem frameworks, sem bundler — HTML5, CSS3 (custom properties, grid, clip/mask) e JavaScript vanilla (ES6+), com física de animação implementada do zero via `requestAnimationFrame`.

```
spider-verse-hub/
├── index.html
├── css/style.css       # tokens, layout, animações
├── js/data.js          # bios e metadados dos personagens/simbiontes/mídia
├── js/script.js        # interatividade: teias, dossiê modal, reveal on scroll
└── img/
    ├── cutouts/        # recortes redondos — seção "Figuras"
    ├── figures/        # capas de HQ — usadas no modal/dossiê
    ├── symbiotes/
    └── games/          # pôsteres/capas — seção Cultura Pop
```

## 🚀 Rodando localmente

Nenhuma dependência para instalar — é servir os arquivos estáticos:

```bash
python -m http.server 8080
# ou
npx serve .
```

Depois abra `http://localhost:8080`.

## 📄 Licença

Uso educacional/portfólio. Personagens, nomes e imagens da Marvel pertencem à Marvel Comics — nenhum direito reivindicado sobre eles.

---

Desenvolvido por [Kauã Hiro Mizumoto](https://kaua-hiro.github.io/portifolio-hiro/)
