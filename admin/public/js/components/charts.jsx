define(['d3', 'react'], function(d3, React) {

  return React.createClass({
    displayName: 'MovingLineChart',

    getInitialState: function() {

      var that = this;
      this.x = d3.scale.linear().domain(this.props.xdomain).range([0, this.props.width]);
      this.y = d3.scale.linear().domain(this.props.ydomain).range([this.props.height, 0]);
      this.line = d3.svg.line()
        .interpolate(this.props.interpolation)
        .x(function(d, i) { return that.x(i); })
        .y(function(d, i) { return that.y(d); });
      
      var data = d3.range(this.props.xdomain[1] - this.props.xdomain[0]).map(function() { return that.props.value; });
      
      return {
        maxVal: parseFloat(this.props.ydomain[0]),
        minVal: parseFloat(this.props.ydomain[1]),
        data: data,
        lineData: ""
      };

    },

    getDefaultProps: function() {
      return {
        title: "Chart", 
        ydomain: [0, 100],
        xdomain: [1, 300], 
        interpolation: "basis",
        width: 450,
        y_width: 50,
        height: 90,
        value: 0
      }
    },

    render: function() {

      return (
        <table cellPadding="0" cellSpacing="0" className="graph">
        <tbody>
          <tr>
            <td className="header title">
              <span className="label label-default">{this.props.title}</span>
            </td>
          </tr>
          <tr>
            <td>
              <svg width={this.props.width} height={this.props.height}>
                <g>
                  <defs><clipPath id="clip"><rect x={this.props.y_width} width={this.props.width-this.props.y_width} height={this.props.height}></rect></clipPath></defs>
                  <g clipPath="url(#clip)"><path ref="path" className="line" d={this.state.lineData} transform=""></path></g>
                  <g className="y_axis" ref="y_axis" transform={ "translate("+this.props.y_width+",0)" }></g>
                </g>
              </svg>
            </td>
            <td className="values">
              <div><span className="label label-primary">Current</span><span className="label label-primary">{this.props.value}</span></div>
              <div><span className="label label-info">Min</span><span className="label label-info">{this.state.minVal}</span></div>
              <div><span className="label label-info">Max</span><span className="label label-info">{this.state.maxVal}</span></div>
            </td>

          </tr>
        </tbody>
        </table>
      );
    },

    updateGraphData: function() {
      var newPoint = this.props.value;
      var newData = this.state.data.slice(1).concat([newPoint]);
      var newState = { data: newData, lineData: this.line(newData), source:"internal"};
      
      if (newPoint > this.state.maxVal) {
        newState.maxVal = newPoint;
      } else if (newPoint < this.state.minVal) {
        newState.minVal = newPoint;
      }
      this.setState(newState);
    },

    componentDidMount: function() {
      d3.select(this.refs.y_axis).call(d3.svg.axis().scale(this.y).ticks(5).orient("left"));
    },

    componentDidUpdate: function () {
      var that = this;
      // redraw the line, and then slide it to the left
      d3.select(that.refs.path)
        .transition()
        .duration(100)
        .ease("linear")
        .attr("transform", "translate(" + that.x(0) + ")")
        .each("end", function() { that.updateGraphData(); });
    }

  });
});
