import * as React from "react";
import { Tree, Button } from 'antd';
import type { DataNode, TreeProps } from 'antd/es/tree';

import { throttle } from 'lodash';
import classnames from 'classnames';
import useStore, { LogType } from './pendingStore';
import styles from './PendingStatsView.module.css';
import { AlertTriangle, CheckCircle, ArrowDownUp, Activity, LineChart, Cog, Siren, FileType, ScrollText, Info, AlertCircle, XCircle, ChevronRight, Terminal, RedoDot, UploadCloud, DownloadCloud } from 'lucide-react';
import { log } from '../moreOnLog'
import { Utils } from '../utils/utils';
import { Notice } from "obsidian";
import Logo from './InvioLogo';
import InvioPlugin from "src/main";
import { CheckSettingsModal } from './CheckSettingsModal';

export const PendingStatsViewComponent = (props: { plugin: InvioPlugin }) => {
    const { record, toLocalSelected, toRemoteSelected, getToLocalFileList, getToRemoteFileList, updateSelectedToLocalFileList, updateSelectedToRemoteFileList } = useStore();
    const toLocalTouched = getToLocalFileList();
    console.log('toLocaltouched - ', toLocalTouched)

    const toRemoteTouched = getToRemoteFileList();
    console.log('toRemoteTouched - ', toRemoteTouched)
    const selectedKeys = [];
    if (!(toLocalTouched.length > 0) && !(toRemoteTouched.length > 0)) {
        return <>
            <h4 className={styles['header']}><Logo className={styles['icon']} />Changed Files</h4>
            <div className={styles['emptyReport']}>
                <ScrollText className={styles['icon']} />
                <span>No file changed</span>
            </div>
        </>
    }

    const treeToLocalData: DataNode[] = toLocalTouched.map((item: any) => {
        item.title = item.key
        item.key = item.key
        return item;
    })
    const treeToRemoteData: DataNode[] = toRemoteTouched.map((item: any) => {
        item.title = item.key
        item.key = item.key
        return item;
    })

    const onSelect = (selectedKeys: any, info: any, type: `ToLocal` | `ToRemote`) => {
        console.log('selected', selectedKeys, info);
        const key = selectedKeys[0]
        props.plugin.viewFileDiff(key, type === 'ToLocal' ? 'RemoteToLocal' : 'LocalToRemote')
        setTimeout(() => {
            selectedKeys = []
        }, 3000)
    };

    const onToLocalSelect: TreeProps['onSelect'] = (selectedKeys: any, info: any) => {
        onSelect(selectedKeys, info, 'ToLocal')
    }

    const onToRemoteSelect: TreeProps['onSelect'] = (selectedKeys: any, info: any) => {
        onSelect(selectedKeys, info, 'ToRemote')
    }

    const onToLocalCheck: TreeProps['onCheck'] = (checkedKeys: string[], info: any) => {
        console.log('onLocalCheck', checkedKeys, info);
        updateSelectedToLocalFileList(checkedKeys.filter(key => toLocalTouched.find(t => t.key === key)))
    };

    const onToRemoteCheck: TreeProps['onCheck'] = (checkedKeys: string[], info: any) => {
        console.log('onToRemoteCheck', checkedKeys, info);
        updateSelectedToRemoteFileList(checkedKeys.filter(key => toRemoteTouched.find(t => t.key === key)))
    };

    const startSync = async () => {
        console.log('start syncing...', [...toLocalSelected, ...toRemoteSelected])
        await props.plugin.syncRun('manual', [...toLocalSelected, ...toRemoteSelected])
    }

    const openSettings = () => {
        console.log('open settings');
        const modal = new CheckSettingsModal(props.plugin.app, props.plugin);
        modal.open();
    }

    return (
        <>
            <h4 className={styles['header']}>
                <Logo className={styles['icon']} />
                Touched Files Status
                <Cog className={styles['settings']} onClick={openSettings} />
            </h4>
            {
                treeToLocalData?.length > 0 ?
                    <>
                        <div className={styles['subHeader']}>Online Changed Files</div>
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
            
            <div className={styles['subHeader']}>Local Changed Files</div>
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
            <div className={styles['actions']}>
                <Button onClick={startSync}>Sync</Button>
            </div>
        </>
    );
}
