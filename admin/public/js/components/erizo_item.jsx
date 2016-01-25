define(['react', 'pubsub'], function (React, PubSub) {

  return React.createClass({
    displayName: 'ErizoItem',
    
    getInitialState: function() {
      return {
        publisherMetadata: {}  
      };
    },

    render: function() {
      var that = this;

      return <li key={this.props.item.id}>
        <div>
          <div>{this.props.item.id}</div>
          <div>{this.props.item.idle ? "idle" : "busy"}</div>
          <div>{this.props.item.pid}</div>
          <ul>
          {
            Object.keys(that.state.publisherMetadata).map(function(p) {
              var d = that.state.publisherMetadata[p];

              return (
                <li key={that.props.item.id + "-" + p}>
                <div>{p}</div>
                  <ul>
                  <li>{JSON.stringify(that.props.stats[p]) || "Statistics Disabled"}</li>
                  {
                    Object.keys(d).map(function(k) {
                      var v = d[k];
                      return <li key={that.props.item.id + "-" + p + "-" + k}>{k} - {JSON.stringify(v)}</li>
                    })
                  }
                  </ul>
                </li>
              );
            })
          }
          </ul>
        </div>
      </li>;

    },
    
    updatePublisherMetadata: function() {
      var that = this;

      PubSub.call("ErizoJS_"+ this.props.item.id + ".getPublisherMetadata", null, function(resp) {
        that.setState({publisherMetadata: resp});
      });
    },

    componentDidMount: function() {
      var that = this;
      setInterval(function() {
        that.updatePublisherMetadata();
      }, 2000);
    },

  });

});

