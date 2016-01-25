define(['pubsub', 'react', 'jsx!components/erizo_item'], function (PubSub, React, ErizoItem) {

  var DATA_INTERVAL = 5000;

  return React.createClass({
    displayName: 'ErizoList',

    getInitialState: function() {
      return { erizos:[], stats: {}, showStats: false }
    },

    getDefaultProps: function() {
      return { stats: {} };
    },
    
    updateErizoJSData: function() {
      var that = this;

      PubSub.broadcast("ErizoAgent.getErizoJSInfo", null, function(resp) {
        that.setState({erizos: resp.erizos});
      });
      
      setTimeout(this.updateErizoJSData, DATA_INTERVAL);
    },

    componentDidMount: function () {
      var that = this;
      this.updateErizoJSData();
      
      PubSub.subscribe('stats', function(stat) {
        var stats = that.state.stats;
        stats[stat.pub] = stat;
        that.setState({stats: stats});
      });
    },
    
    render: function() {
      var that = this;
      var createItem = function(item) {
        return (
            <ErizoItem item={item} key={item.id} stats={that.state.showStats ? that.state.stats : {}}/>
        );
      };
      return (
        <div className="erizo_list">
          <div className="panel panel-default">
            <div className="panel-heading"><h3 className="panel-title">Erizo JS Processes</h3></div>
            <div className="panel-heading">
              <label className="checkbox-inline" htmlFor="showStats">
                <input id="showStats" type="checkbox" checkedLink={{ value: this.state.showStats, requestChange: function(val) { that.setState({showStats: val});} }} />
                Show Rtcp Stats
              </label>
            </div>
            <div className="panel-body">{ this.state.erizos.map(createItem) }</div>
          </div>
        </div>
      );
    }
  });
});

