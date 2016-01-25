define(['jsx!components/dashboard', 'react', 'react_dom'], function (Dashboard, React, ReactDOM) {

  ReactDOM.render(React.createElement(Dashboard), document.getElementById('container'));
});
