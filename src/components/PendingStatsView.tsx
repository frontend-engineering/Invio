import * as React from "react";
import { Tree, Button } from 'antd';
import classnames from 'classnames';
import type { DataNode, TreeProps } from 'antd/es/tree';
import useStore, { LogType } from './pendingStore';
import styles from './PendingStatsView.module.css';
import { AlertTriangle, CheckCircle, ArrowDownUp, Activity, LineChart, Cog, Siren, FileType, ScrollText, Info, AlertCircle, XCircle, ChevronRight, Terminal, RedoDot, UploadCloud, DownloadCloud } from 'lucide-react';
import { log } from '../moreOnLog'
import Logo from './InvioLogo';
import InvioPlugin from "src/main";
import { CheckSettingsModal } from './CheckSettingsModal';

export const PendingStatsViewComponent = (props: { plugin: InvioPlugin }) => {
    const { loading, getToLocalFileList, getToRemoteFileList, getAllCheckedFileList, existToLocalFile, existToRemoteFile, updateSelectedToLocalFileList, updateSelectedToRemoteFileList } = useStore();
    const toLocalTouched = getToLocalFileList();

    const toRemoteTouched = getToRemoteFileList();

    const treeToLocalData: DataNode[] = toLocalTouched
    const treeToRemoteData: DataNode[] = toRemoteTouched

    const onSelect = (selectedKeys: any, info: any, type: `ToLocal` | `ToRemote`) => {
        log.info('on select: ', selectedKeys)
        const key = selectedKeys[0]
        if (!key) return;
        props.plugin.viewFileDiff(key, type === 'ToLocal' ? 'RemoteToLocal' : 'LocalToRemote')
            .then(file => {
                log.info('diff file changed - ', file);
                if (file) {
                    props.plugin.pendingView()
                }
              })

        setTimeout(() => {
            selectedKeys = []
        }, 300)
    };

    const onToLocalSelect: TreeProps['onSelect'] = (selectedKeys: any, info: any) => {
        const keys = selectedKeys.filter((key: string) => existToLocalFile(key))
        onSelect(keys, info, 'ToLocal')
    }

    const onToRemoteSelect: TreeProps['onSelect'] = (selectedKeys: any, info: any) => {
        const keys = [ ...selectedKeys ].filter((key: string) => existToRemoteFile(key))
        onSelect(keys, info, 'ToRemote')
    }

    const onToLocalCheck: TreeProps['onCheck'] = (checkedKeys: string[], info: any) => {
        updateSelectedToLocalFileList(checkedKeys)
    };

    const onToRemoteCheck: TreeProps['onCheck'] = (checkedKeys: string[], info: any) => {
        updateSelectedToRemoteFileList(checkedKeys)
    };

    const startSync = async () => {
        await props.plugin.syncRun('manual', getAllCheckedFileList())
    }

    const openSettings = () => {
        const modal = new CheckSettingsModal(props.plugin.app, props.plugin);
        modal.open();
    }

    const loadingSVG = () => <svg style={{ height: '18px', marginRight: '6px' }} version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
      width="36px" height="45px" viewBox="0 0 24 30" xmlSpace="preserve">
      <rect x="0" y="13" width="4" height="5" fill="currentColor">
        <animate attributeName="height" attributeType="XML"
          values="5;21;5" 
          begin="0s" dur="0.6s" repeatCount="indefinite" />
        <animate attributeName="y" attributeType="XML"
          values="13; 5; 13"
          begin="0s" dur="0.6s" repeatCount="indefinite" />
      </rect>
      <rect x="10" y="13" width="4" height="5" fill="currentColor">
        <animate attributeName="height" attributeType="XML"
          values="5;21;5" 
          begin="0.15s" dur="0.6s" repeatCount="indefinite" />
        <animate attributeName="y" attributeType="XML"
          values="13; 5; 13"
          begin="0.15s" dur="0.6s" repeatCount="indefinite" />
      </rect>
      <rect x="20" y="13" width="4" height="5" fill="currentColor">
        <animate attributeName="height" attributeType="XML"
          values="5;21;5" 
          begin="0.3s" dur="0.6s" repeatCount="indefinite" />
        <animate attributeName="y" attributeType="XML"
          values="13; 5; 13"
          begin="0.3s" dur="0.6s" repeatCount="indefinite" />
      </rect>
    </svg>

    return (
        <div className={styles['viewContainer']}>
            <h4 className={styles['header']}>
                <Logo className={styles['icon']} />
                Touched Files Status
                <Cog className={styles['settings']} onClick={openSettings} />
            </h4>
            <div className={classnames(styles['scrollContainer'], loading ? styles['loadingOpacity'] : null)}>
                <div className={styles['extraAction']}>
                    { loading ? loadingSVG() : null}
                    <div className={styles['btn']} onClick={() => { props.plugin.pendingView()}}><ArrowDownUp className={styles['icon']} />Refresh</div>
                </div>
                {
                    (!(toLocalTouched.length > 0) && !(toRemoteTouched.length > 0)) ?
                        <div className={styles['emptyReport']}>
                            <ScrollText className={styles['icon']} />
                            <span>No file changed</span>
                        </div> : null
                }
                {
                    treeToLocalData?.length > 0 ?
                        <>
                            <div className={styles['subHeader']}>
                                <DownloadCloud className={styles['icon']} />
                                Online Changed Files
                            </div>
                            <Tree
                                checkable
                                showLine
                                defaultExpandAll
                                multiple={false}
                                rootStyle={{
                                    background: 'black',
                                    color: 'white',
                                    paddingTop: '18px',
                                    paddingBottom: '18px',
                                }}
                                selectedKeys={[]}
                                onSelect={onToLocalSelect}
                                onCheck={onToLocalCheck}
                                treeData={treeToLocalData}
                            />
                        </> :
                        null
                }
                {
                    treeToRemoteData?.length > 0 ?
                    <>
                        <div className={styles['subHeader']}>
                            <UploadCloud className={styles['icon']} />
                            Local Changed Files
                        </div>
                        <Tree
                            checkable
                            showLine
                            defaultExpandAll
                            multiple={false}
                            rootStyle={{
                                background: 'black',
                                color: 'white',
                                paddingTop: '18px',
                                paddingBottom: '18px',
                            }}
                            selectedKeys={[]}
                            onSelect={onToRemoteSelect}
                            onCheck={onToRemoteCheck}
                            treeData={treeToRemoteData}
                        />
                    </> :
                    null
                }
                {
                    (!(toLocalTouched.length > 0) && !(toRemoteTouched.length > 0)) ? null :
                    <div className={styles['actions']}>
                        <Button onClick={startSync}>Sync</Button>
                    </div>
                }
            </div>
        </div>
    );
}
