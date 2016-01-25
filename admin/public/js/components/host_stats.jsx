define(['pubsub', 'react', 'jsx!components/charts'], function (PubSub, React, MovingLineChart) {

  var xdomain_length = 300;
  var DATA_INTERVAL = 5000;

  return React.createClass({
    displayName: 'HostStats',

    getInitialState: function() {
      return { cpu: 0, mem: 0 };
    },

    updateHostData: function() {
      var that = this;

      PubSub.broadcast("ErizoAgent.getErizoAgents", null, function(resp) {
        that.setState({
          cpu: Math.ceil(resp.stats.perc_cpu*100),
          mem: Math.ceil(resp.stats.perc_mem*100)
        });
      });

      setTimeout(this.updateHostData, DATA_INTERVAL);
    },

    componentDidMount: function () {
      this.updateHostData();
    },
    
    render: function() {
      return (
        <div className="host_stats">
          <div className="panel panel-default">
            <div className="panel-heading"><h3 className="panel-title">Host Stats</h3></div>
            <div className="panel-body">
              <MovingLineChart title="cpu" value={this.state.cpu} />
              <MovingLineChart title="mem" value={this.state.mem} />
            </div>
          </div>
        </div>
      );
    }
  });
});

