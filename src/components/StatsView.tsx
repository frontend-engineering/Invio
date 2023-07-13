import * as React from "react";
import useStore from './store';
import styles from './StatsView.module.css';
import { FileOrFolderMixedState } from "src/baseTypes";
import { AlertTriangle, CheckCircle } from 'lucide-react'
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

export const StatsViewComponent = (props: { plugin: Plugin}) => {
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

    {syncList?.length > 0 ? <h4>Sync Job</h4> : null}
    {(syncList?.length > 0) ? syncList.map(job => (
      <div key={job.key} className={styles['listItem']}>
        <span className={styles['listItemLongSpan']}>{job.key}</span>
        <span className={styles['listItemShortSpan']}>{getIconByStatus(job.syncStatus)}</span>
      </div>
    )) : null}
    {pubList.length > 0 ? <h4>Publish Job</h4> : null}
    {pubList.length > 0 ? pubList.map(job => (
      <div key={job.key} className={styles['listItem']}>
        <span className={styles['listItemLongSpan']}>{job.key}</span>
        <span className={styles['listItemShortSpan']}>{getIconByStatus(job.syncStatus)}</span>
      </div>
    )) : null}
    {(pubList.length > 0) || (syncList.length > 0) ? <div className={styles['divider']}></div> : null}
    {finished.length > 0 ? <h4>Finished Job</h4> : null}
    {finished.length > 0 ? finished.map(job => (
      <div key={job.key} className={styles['listItem']}>
        <span onClick={() => {openFile(job.key)}} className={styles['listItemLongSpan']}>{job.key}</span>
        <span onClick={() => onCheckLink(job.remoteLink)} className={styles['listItemShortSpan']}>{getIconByStatus(job.syncStatus)}</span>
      </div>
    )) : null}
    {failList.length > 0 ? <h4>Fail Job</h4> : null}
    {failList.length > 0 ? failList.map(job => (
      <div key={job.key} className={styles['listItem']}>
        <span className={styles['listItemLongSpan']}>{job.key}</span>
        <span className={styles['listItemShortSpan']}>{getIconByStatus(job.syncStatus)}</span>
      </div>
    )) : null}
  </>;
};
