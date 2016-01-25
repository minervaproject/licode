define(['pubsub', 'jsx!components/charts', 'react', 'jsx!components/erizo_list'], function (PubSub, MovingLineChart, React, ErizoList) {
  var xdomain_length = 300;
  var DATA_INTERVAL = 5000;
  var latest = {cpu:0, mem:0};

  return React.createClass({
    displayName: 'Dashboard',
    
    getInitialState: function() {
      return { cpu:0, mem:0, erizos:[], stats: {} }
    },
    
    updateLicodeData: function() {
      var that = this;

      PubSub.broadcast("ErizoAgent.getErizoAgents", null, function(resp) {
        that.setState({
          cpu: Math.ceil(resp.stats.perc_cpu*100),
          mem: Math.ceil(resp.stats.perc_mem*100)
        });
        // latest.cpu = Math.ceil(resp.stats.perc_cpu*100);//100;
        // latest.mem = Math.ceil(resp.stats.perc_mem*100);//100;
      });
      PubSub.broadcast("ErizoAgent.getErizoJSInfo", null, function(resp) {
        that.setState({erizos: resp.erizos});
      });
      
      setTimeout(this.updateLicodeData, DATA_INTERVAL);
    },

    componentDidMount: function () {
      var that = this;
      this.updateLicodeData();
      
      // PubSub.subscribe('stats', function(stat) {
      //   var stats = that.state.stats;
      //   stats[stat.pub] = stat;
      //   // console.log('got hhhheeeeee', resp);
      //   that.setState({stats: stats});
      // });
    },
    
    render: function() {
      return (
        <div>
          <h3>Licode Admin</h3>
          <div id="graphHolder">
            <MovingLineChart title="cpu" value={this.state.cpu} />
            <MovingLineChart title="mem" value={this.state.mem} />
          </div>
          <div id="erizoJSInfo">
            <ErizoList ref="erizo_list" erizos={this.state.erizos} stats={this.state.stats}/>
          </div>
        </div>
      );
    }
  });
});