import * as React from "react";
import useStore from './store';


export const StatsViewComponent = () => {
  const { record } = useStore();

  return <>
    <h4>Change File List</h4>
    {record && (Object.keys(record).length > 0) ? Object.keys(record).map(key => (
      <div key={key}>
        <span>{record[key].key}</span>
        <span>{record[key].syncStatus}</span>
        {/* <p>{JSON.stringify(record[key])}</p> */}
      </div>    
    )) : <p>No file</p>}
  </>;
};
