define(['pubsub', 'react', 'jsx!components/erizo_publisher'], function (PubSub, React, ErizoPublisher) {

  return React.createClass({
    displayName: 'ErizoItem',
    
    getInitialState: function() {
      return {
        publisherMetadata: {}
      };
    },

    render: function() {
      var that = this;

      var createItem = function(key) {
        return (
            <ErizoPublisher item={that.state.publisherMetadata[key]} key={that.props.item.id + "-" + key} pub={key} stats={that.props.stats[key]}/>
        );
      };

      return (
        <div className="erizo_item panel panel-primary">
            <div className="panel-heading">
              <div>ErizoJS_{this.props.item.id}</div>
              <div><span className="label label-default">PID</span><span className="label label-info">{this.props.item.pid}</span></div>
              <div><span className="label label-default">State</span><span className={"label label-" + (this.props.item.idle ? "default" : "success")}>{this.props.item.idle ? "idle" : "busy"}</span></div>
            </div>
            { (Object.keys(that.state.publisherMetadata).length == 0 ? "" : (
              <div className="panel-body">
                { Object.keys(that.state.publisherMetadata).map(createItem) }
              </div>
            )) }
        </div>
      );
    },
    
    updatePublisherMetadata: function() {
      var that = this;

      PubSub.call("ErizoJS_"+ this.props.item.id + ".getPublisherMetadata", null, function(resp) {
        if (that.isMounted()) {
          that.setState({publisherMetadata: resp});
        }
      });
    },

    componentDidMount: function() {
      var that = this;
      this.interval = setInterval(function() {
        that.updatePublisherMetadata();
      }, 2000);
    },
    
    componentWillUnmount: function() {
      if (this.interval) {
        clearInterval(this.interval);
      }
    }

  });

});

