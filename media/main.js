// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
  const vscode = acquireVsCodeApi();

  const oldState = vscode.getState() || { artwork: "" };

  let artwork = oldState.artwork;
  const img = document.querySelector(".album-art");
  const songTitle = document.querySelector(".song");
  const artist = document.querySelector(".artist");
  const album = document.querySelector(".album");

  // Handle messages sent from the extension to the webview
  window.addEventListener("message", (event) => {
    const message = event.data; // The json data that the extension sent
    switch (message.type) {
      case "setArtwork": {
        artwork = decodeURIComponent(message.artwork);
        img.src = artwork;
        break;
      }
      case "setSong": {
        songTitle.innerText = message.data.name;
        artist.innerText = message.data.artist;
        album.innerText = message.data.album;
        break;
      }
    }
  });

  /**
   * @param {string} color
   */
  function onColorClicked(color) {
    vscode.postMessage({ type: "colorSelected", value: color });
  }
})();
