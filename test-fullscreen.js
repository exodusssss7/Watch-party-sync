const hasFullscreen = typeof document !== 'undefined' && ('fullscreenElement' in document || 'webkitFullscreenElement' in document);
console.log(hasFullscreen);
