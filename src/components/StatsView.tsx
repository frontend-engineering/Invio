import * as React from "react";
import { throttle } from 'lodash';
import useStore, { LogType } from './store';
import styles from './StatsView.module.css';
import { AlertTriangle, CheckCircle, ArrowDownUp, Activity, LineChart, ListChecks, Siren, FileType, ScrollText, Info, AlertCircle, XCircle, ChevronRight } from 'lucide-react';
import { log } from '../moreOnLog'
import { Utils } from '../utils/utils';
import { Plugin, Notice } from "obsidian";
import Logo from './InvioLogo';

const { useEffect, useRef } = React

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
  const { record, logs, getPubJobList, getSyncJobList, getFinishedJobList, getFailJobList } = useStore();
  const logsRef = useRef(null);

  const scrollFn = throttle(() => {
    logsRef.current.scrollBy(0, 1000); 
  }, 300)

  useStore.subscribe((state, prev) => {
    if (logsRef.current) {
      if (state.logs?.length > 0) {
        scrollFn();
      }
    }
  })

  if (!record || (Object.keys(record).length === 0)) {
    return <>
      <h4 className={styles['header']}><Logo className={styles['icon']} />Invio Action Report</h4>
      <div className={styles['emptyReport']}>
        <ScrollText className={styles['icon']} />
        <span>No file changed</span>
      </div>
    </>
  }

  const onCheckLink = (url: string) => {
    if (url) {
      open(url);
    }
  }
  const openFile = async (key: string) => {
    if (key) {
      const resp = await Utils.openFile(props.plugin.app.vault, key);
      if (resp === 'Deleted') {
        new Notice('This file already been deleted', 3000);
      }
    }
  }

  const onCheckError = (msg: string) => {
    if (msg) {
      new Notice(msg, 5000)
    }
  }

  const getLogTypeIcon = (type: LogType) => {
    if (type === LogType.LOG) {
      return <Info className={styles['icon']} />
    }
    if (type === LogType.WARN) {
      return <AlertCircle className={styles['icon']} />
    }
    if (type === LogType.ERROR) {
      return <XCircle className={styles['icon']} />
    }
  }

  const getLogTypeColor = (type: LogType) => {
    return type === LogType.ERROR ? '#ff0000e8' :
      type === LogType.WARN ? '#ffff007a' : 
      ''
  }

  const syncList = getSyncJobList();
  const pubList = getPubJobList();
  const finished = getFinishedJobList();
  const failList = getFailJobList();

  return <>
    <h3 className={styles['header']}><Logo className={styles['icon']} />Invio Action Report</h3>
    {(pubList.length > 0) || (syncList.length > 0) ? <h4 className={styles['subHeader']}><Activity className={styles['icon']} />Working Job</h4> : null}
    {syncList?.length > 0 ? <h6 className={styles['subHeader']}><ArrowDownUp className={styles['icon']} />Syncing</h6> : null}
    {(syncList?.length > 0) ? syncList.map(job => (
      <div key={job.key} className={styles['listItem']}>
        <FileType className={styles['icon']} />
        <span className={styles['listItemLongSpan']}>{job.key.split('/').slice(-1)[0]}</span>
        <span className={styles['listItemShortSpan']}>{getIconByStatus(job.syncStatus)}</span>
      </div>
    )) : null}
    {pubList.length > 0 ? <h6 className={styles['subHeader']}><ArrowDownUp className={styles['icon']} />Publishing</h6> : null}
    {pubList.length > 0 ? pubList.map(job => (
      <div key={job.key} className={styles['listItem']}>
        <FileType className={styles['icon']} />
        <span className={styles['listItemLongSpan']}>{job.key.split('/').slice(-1)[0]}</span>
        <span className={styles['listItemShortSpan']}>{getIconByStatus(job.syncStatus)}</span>
      </div>
    )) : null}
    {(pubList.length > 0) || (syncList.length > 0) ? <div className={styles['divider']}></div> : null}
    <h4 className={styles['subHeader']}><LineChart className={styles['icon']} />Statics</h4>
    {finished.length > 0 ? <h6 className={styles['subHeader']}><ListChecks className={styles['icon']} />Finished Files</h6> : null}
    {finished.length > 0 ? finished.map(job => (
      <div key={job.key} className={styles['listItem']}>
        <FileType className={styles['icon']} />
        <span onClick={() => { openFile(job.key) }} className={styles['listItemLongSpan']} title="Click to show file contents">{job.key.split('/').slice(-1)[0]}</span>
        <span onClick={() => onCheckLink(job.remoteLink)} className={styles['listItemShortSpan']} title="Click to show remote url">{getIconByStatus(job.syncStatus)}</span>
      </div>
    )) : null}
    {failList.length > 0 ? <h6 className={styles['subHeader']}><Siren className={styles['icon']} />Failed Files</h6> : null}
    {failList.length > 0 ? failList.map(job => (
      <div key={job.key} className={styles['listItem']}>
        <FileType className={styles['icon']} />
        <span onClick={() => { openFile(job.key) }} className={styles['listItemLongSpan']} title="Click to show file contents">{job.key.split('/').slice(-1)[0]}</span>
        <span onClick={() => onCheckError(job.syncError)} className={styles['listItemShortSpan']} title="Click to show error message">{getIconByStatus(job.syncStatus)}</span>
      </div>
    )) : null}
    {(logs.length > 0) ?
      <>
      <div className={styles['divider']}></div>
      <h4 className={styles['subHeader']}><LineChart className={styles['icon']} />Logs</h4>
      <div className={styles['logsContainer']} ref={logsRef}>
        {logs.map((log, idx) => {
          return <div key={`${idx}-${log.msg?.slice(0, 9)}`} className={styles['logItem']} style={{ color: getLogTypeColor(log.type) }}>
            <ChevronRight className={styles['icon']} />
            { getLogTypeIcon(log.type) }
            {log.msg}
          </div>
        })}
      </div>
      <div className={styles['safeArea']}></div>
      </>
      : null}
  </>;
};
