define(['react', 'jsx!components/charts'], function (React, MovingLineChart) {
  var stat_keys = ["fractionLost", "jitter", "packetsLost", "rtcpBytesSent", "rtcpPacketSent"];
  var ydomains = {
    "fractionLost": [0, 1000],
    "jitter": [0, 10000000000],
    "packetsLost": [0, 100000000],
    "rtcpBytesSent": [0, 10000000],
    "rtcpPacketSent": [0, 100000]
  }
  return React.createClass({
    displayName: 'ErizoPublisher',
    
    render: function() {
      var that = this;

      var showStats = function(k) {
        if (!that.props.stats) {
          return null;
        }
        console.log('got here')

        return (
          <div className="panel-body" key={that.props.key + "-stats"}>
            { that.props.stats.stats.map(function(stats) {
              return (
                <div className="stats_holder">
                  <span className="well well-sm stats_header">{JSON.stringify({type:stats.type, ssrc:stats.ssrc, sourcSsrc:(stats.sourcSsrc || "")})}</span>
                  { stat_keys.map(function(k) {
                    return (!(k in stats) ? null : (<MovingLineChart key={that.props.key + "-stats-" + k} title={k} width="300" value={stats[k]} ydomain={ydomains[k]} />));
                  }) }
                  
                </div>
              );
              
            }) }
            <div style={{clear:"both"}}></div>
            
          </div>
        );

      };

      return (
        <div className="erizo_publisher panel panel-info">
            <div className="panel-heading">
              <span className="pub_id">Publisher: {this.props.pub}</span>
              <span className={"label label-" + (this.props.item.data ? "success" : "danger")}>Data</span>
              <span className={"label label-" + (this.props.item.audio ? "success" : "danger")}>Audio</span>
              <span className={"label label-" + (this.props.item.video ? "success" : "danger")}>Video</span>
              <span className={"label label-" + (this.props.item.screen ? "success" : "danger")}>Screen</span>
              <span className="well well-sm publisher_attrs">{JSON.stringify(this.props.item.attributes)}</span>
            </div>
            { showStats() }
        </div>
      );

    },

  });

});

