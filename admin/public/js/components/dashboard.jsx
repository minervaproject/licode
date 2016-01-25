define(['react', 'jsx!components/host_stats', 'jsx!components/erizo_list'], function (React, HostStats, ErizoList) {

  return React.createClass({
    displayName: 'Dashboard',
    
    render: function() {
      return (
        <div>
          <h2 className="page-header">Licode Admin</h2>

          <HostStats />

          <ErizoList/>
        </div>
      );
    }
  });
});