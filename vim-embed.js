/**
 * The learn-neovim card boots its demo on demand. The facade is a drawn nvim
 * window that costs nothing to keep on the page; pressing boot swaps it for
 * an iframe onto the real trainer, which lives on its own Pages deploy at
 * /learnNvim/ and ships itself whenever that repo changes — this page never
 * needs to know a build happened.
 */
const screen = document.getElementById('vim-screen');
const boot = document.getElementById('vim-boot');

if (screen && boot) {
  boot.addEventListener(
    'click',
    () => {
      const frame = document.createElement('iframe');
      frame.className = 'vim-frame';
      frame.title = 'learn neovim — an interactive Neovim and NvChad trainer';
      frame.src = 'https://michaelzhou05.github.io/learnNvim/';
      frame.allow = 'fullscreen';
      // Keys should land in the trainer straight away, not on the page.
      frame.addEventListener('load', () => frame.focus(), { once: true });
      screen.append(frame);
      screen.querySelector('.game-overlay')?.remove();
    },
    { once: true },
  );
}
