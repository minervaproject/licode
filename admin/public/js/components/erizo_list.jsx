define(['react', 'jsx!components/erizo_item'], function (React, ErizoItem) {

  return React.createClass({
    displayName: 'ErizoList',

    getDefaultProps: function() {
      return { erizos:[], stats: {} };
    },
    
    render: function() {
      var that = this;
      var createItem = function(item) {
        return <ErizoItem item={item} key={item.id} stats={that.props.stats}/>;
      };

      return <ul>{ this.props.erizos.map(createItem) }</ul>;

    }
  });
});

