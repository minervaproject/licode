// For any third party dependencies, like jQuery, place them in the lib folder.

// Configure loading modules from the lib directory,
// except for 'app' ones, which are in a sibling
// directory.
requirejs.config({
  baseUrl: '/public/js',
  paths: {
    socketio: "/socket.io/socket.io",
    bootstrap: "//maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min",
    jquery: "//code.jquery.com/jquery-1.12.0.min",
    react: "//cdnjs.cloudflare.com/ajax/libs/react/0.14.6/react-with-addons",
    react_dom: "//cdnjs.cloudflare.com/ajax/libs/react/0.14.6/react-dom",
    d3: "//d3js.org/d3.v3",
    babel: "//cdnjs.cloudflare.com/ajax/libs/babel-core/5.8.34/browser.min",
    babel_polyfill: "//cdnjs.cloudflare.com/ajax/libs/babel-core/5.8.34/browser-polyfill.min",
    text: "./lib/requirejs-text/text",
    jsx: "./lib/requirejs-react-jsx/jsx"
  },
  shim: {
    'bootstrap': { deps: ['jquery'] },
    'jsx': { deps: ['babel', 'babel_polyfill', 'text'] },
    'babel_polyfill': { deps: ['babel'] }
  }
});

// Start loading the main app file. Put all of
// your application logic in there.
requirejs(['bootstrap', 'main']);