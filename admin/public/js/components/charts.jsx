define(['d3', 'react'], function(d3, React) {

  var margin = {top: 5, right: 0, bottom: 5, left: 100},
    width = 450 - margin.right,
    height = 90 - margin.top - margin.bottom;


  return React.createClass({
    displayName: 'MovingLineChart',

    getInitialState: function() {

      var that = this;
      this.x = d3.scale.linear().domain(this.props.xdomain).range([0, width]);
      this.y = d3.scale.linear().domain(this.props.ydomain).range([height, 0]);
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
        value: 0
      }
    },

    render: function() {

      return (
        <table cellPadding="0" cellSpacing="0"><tbody><tr>
          <td className="header">{this.props.title}</td>
          <td className="graph">
            <svg width={width + margin.left + margin.right} height={height + margin.top + margin.bottom} style={{"marginLeft": (0-margin.left)+"px"}}>
              <g transform={ "translate("+margin.left+","+margin.top+")" }>
                <defs><clipPath id="clip"><rect width={width} height={height}></rect></clipPath></defs>
                <g className="y_axis" ref="y_axis"></g>
                <g clipPath="url(#clip)"><path ref="path" className="line" d={this.state.lineData} transform=""></path></g>
              </g>
            </svg>
          </td>
          <td>{this.props.value}</td>
          <td>{this.state.minVal}</td>
          <td>{this.state.maxVal}</td>
        </tr></tbody></table>
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
