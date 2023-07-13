import * as React from "react";
import useStore from './store';
import styles from './StatsView.module.css';
import { FileOrFolderMixedState } from "src/baseTypes";
import { AlertTriangle, CheckCircle, ArrowDownUp, Activity, LineChart, ListChecks, Siren, FileType } from 'lucide-react';
import { log } from '../moreOnLog'
import { Utils } from '../utils/utils';
import { Plugin } from "obsidian";

const getIconByStatus = (status: string) => {
  if (status === 'done') {
    return <CheckCircle className={styles['icon']} />
  }
  if (status === 'fail') {
    return <AlertTriangle className={styles['icon']} />
  }
  return <div className={styles.loading}></div>
}

export const StatsViewComponent = (props: { plugin: Plugin }) => {
  const { record, getPubJobList, getSyncJobList, getFinishedJobList, getFailJobList } = useStore();
  if (!record || (Object.keys(record).length === 0)) {
    return <>
      <h4>Change File List</h4>
      <div className={styles['listItem']}>No file</div>
    </>
  }

  const onCheckLink = (url: string) => {
    if (url) {
      log.info('open url: ', url);
      open(url);
    }
  }
  const openFile = (key: string) => {
    if (key) {
      log.info('open file: ', key);
      Utils.openFile(props.plugin.app.vault, key);
    }
  }


  const syncList = getSyncJobList();
  const pubList = getPubJobList();
  const finished = getFinishedJobList();
  const failList = getFailJobList();

  return <>
    <h3 className={styles['subHeader']}>Invio Action Report</h3>
    {(pubList.length > 0) || (syncList.length > 0) ? <h4 className={styles['subHeader']}><Activity className={styles['icon']} />Working Job</h4> : null}
    {syncList?.length > 0 ? <h6 className={styles['subHeader']}><ArrowDownUp className={styles['icon']} />Syncing</h6> : null}
    {(syncList?.length > 0) ? syncList.map(job => (
      <div key={job.key} className={styles['listItem']}>
        <FileType className={styles['icon']} />
        <span className={styles['listItemLongSpan']}>{job.key}</span>
        <span className={styles['listItemShortSpan']}>{getIconByStatus(job.syncStatus)}</span>
      </div>
    )) : null}
    {pubList.length > 0 ? <h6 className={styles['subHeader']}><ArrowDownUp className={styles['icon']} />Publishing</h6> : null}
    {pubList.length > 0 ? pubList.map(job => (
      <div key={job.key} className={styles['listItem']}>
        <FileType className={styles['icon']} />
        <span className={styles['listItemLongSpan']}>{job.key}</span>
        <span className={styles['listItemShortSpan']}>{getIconByStatus(job.syncStatus)}</span>
      </div>
    )) : null}
    {(pubList.length > 0) || (syncList.length > 0) ? <div className={styles['divider']}></div> : null}
    <h4 className={styles['subHeader']}><LineChart className={styles['icon']} />Statics</h4>
    {finished.length > 0 ? <h6 className={styles['subHeader']}><ListChecks className={styles['icon']} />Finished Files</h6> : null}
    {finished.length > 0 ? finished.map(job => (
      <div key={job.key} className={styles['listItem']}>
        <FileType className={styles['icon']} />
        <span onClick={() => { openFile(job.key) }} className={styles['listItemLongSpan']}>{job.key}</span>
        <span onClick={() => onCheckLink(job.remoteLink)} className={styles['listItemShortSpan']}>{getIconByStatus(job.syncStatus)}</span>
      </div>
    )) : null}
    {failList.length > 0 ? <h6 className={styles['subHeader']}><Siren className={styles['icon']} />Failed Files</h6> : null}
    {failList.length > 0 ? failList.map(job => (
      <div key={job.key} className={styles['listItem']}>
        <FileType className={styles['icon']} />
        <span className={styles['listItemLongSpan']}>{job.key}</span>
        <span className={styles['listItemShortSpan']}>{getIconByStatus(job.syncStatus)}</span>
      </div>
    )) : null}
  </>;
};
