document.addEventListener("DOMContentLoaded", () => {
  const root = document.documentElement;
  const accessibility = document.getElementById("accessibility");
  if (!accessibility) return;

  const controls = accessibility.querySelector(".tts-controls");
  const smallerButton = document.getElementById("button_small");
  const largerButton = document.getElementById("button_large");
  const toggleButton = document.getElementById("button_TTS");
  const playButton = document.getElementById("button_TTS_play");
  const pauseButton = document.getElementById("button_TTS_pause");
  const previousButton = document.getElementById("button_TTS_backward");
  const nextButton = document.getElementById("button_TTS_forward");
  const sizes = [80, 90, 100, 115, 130, 145];
  let sizeIndex = Number.parseInt(localStorage.getItem("nourish.fontSize") ?? "2", 10);
  let speechIndex = 0;
  let spokenElements = [];

  if (!Number.isInteger(sizeIndex) || sizeIndex < 0 || sizeIndex >= sizes.length) {
    sizeIndex = 2;
  }

  function applyFontSize() {
    // Scaling the root keeps relative units consistent across every page.
    root.style.fontSize = `${sizes[sizeIndex]}%`;
    localStorage.setItem("nourish.fontSize", String(sizeIndex));
  }

  function resetHighlight() {
    for (const element of spokenElements) {
      element.classList.remove("tts-speaking");
    }
  }

  function collectReadableElements() {
    // Read semantic content in DOM order and exclude the accessibility toolbar.
    return Array.from(
      document.querySelectorAll(
        "main h1, main h2, main h3, main p, main label, main th, main td, main a, main button:not(#accessibility button), header a, header h1, footer a, footer p"
      )
    ).filter((element) => element.textContent.trim() && !element.hidden);
  }

  function speakAt(index) {
    if (
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      return;
    }
    spokenElements = collectReadableElements();
    if (spokenElements.length === 0) return;

    speechIndex = Math.max(0, Math.min(index, spokenElements.length - 1));
    window.speechSynthesis.cancel();
    resetHighlight();

    const element = spokenElements[speechIndex];
    const utterance = new window.SpeechSynthesisUtterance(
      element.textContent.trim()
    );
    utterance.addEventListener("start", () => element.classList.add("tts-speaking"));
    utterance.addEventListener("end", () => {
      element.classList.remove("tts-speaking");
      // Continue through the page until the final readable element.
      if (speechIndex < spokenElements.length - 1) {
        speakAt(speechIndex + 1);
      }
    });
    utterance.addEventListener("error", resetHighlight);
    window.speechSynthesis.speak(utterance);
  }

  smallerButton?.addEventListener("click", () => {
    sizeIndex = Math.max(0, sizeIndex - 1);
    applyFontSize();
  });

  largerButton?.addEventListener("click", () => {
    sizeIndex = Math.min(sizes.length - 1, sizeIndex + 1);
    applyFontSize();
  });

  toggleButton?.addEventListener("click", () => {
    if (!controls) return;
    const isOpen = controls.hidden;
    controls.hidden = !isOpen;
    toggleButton.setAttribute("aria-expanded", String(isOpen));
    if (!isOpen && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      resetHighlight();
    }
  });

  playButton?.addEventListener("click", () => speakAt(0));
  pauseButton?.addEventListener("click", () => {
    if (!("speechSynthesis" in window)) return;
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    else window.speechSynthesis.pause();
  });
  previousButton?.addEventListener("click", () => speakAt(speechIndex - 1));
  nextButton?.addEventListener("click", () => speakAt(speechIndex + 1));

  window.addEventListener("beforeunload", () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  });
  applyFontSize();
});
