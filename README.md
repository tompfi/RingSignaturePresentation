# Ring Signature Algorithm — Explained Visually

An interactive, step-by-step visualization of the ring signature scheme from Rivest, Shamir & Tauman's paper [*How to Leak a Secret*](https://people.csail.mit.edu/rivest/RivestShamirTauman-HowToLeakASecret.pdf) (2001).

**Live demo:** [visualringsignature.com](https://visualringsignature.com)

Walk through each phase of the algorithm — key setup, signing, and verification — with an animated ring diagram, live data tables, and KaTeX-rendered formulas.

## Features

- Step-by-step explanation with manual or auto-play navigation
- Configurable ring size (3–7 members) and signer selection
- Visual ring diagram showing the signing chain
- Real-time display of intermediate values and cryptographic formulas

## Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Tech Stack

- [Vite](https://vitejs.dev/)
- Vanilla JavaScript
- [KaTeX](https://katex.org/) for math rendering

## License

This project is for educational purposes.
