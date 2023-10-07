import {v4 as uuidv4} from 'uuid';
import { machineIdSync } from './utils/machine-id';
let cID = machineIdSync(false);

export class Analytics4 {
    private trackingID: string;
    private secretKey: string;
    private clientID: string;
    private sessionID: string;
    private customParams: Record<string, unknown> = {};
    private userProperties: Record<string, unknown> | null = null;

    private baseURL = 'https://google-analytics.com/mp';
    private collectURL = '/collect';

    constructor(trackingID: string, secretKey: string, clientID: string = cID, sessionID = uuidv4()) {
        this.trackingID = trackingID;
        this.secretKey = secretKey;
        this.clientID = clientID;
        this.sessionID = sessionID;
    }

    set(key: string, value: any) {
        if (value !== null) {
            this.customParams[key] = value;
        } else {
            delete this.customParams[key];
        }

        return this;
    }

    setParams(params?: Record<string, unknown>) {
        if (typeof params === 'object' && Object.keys(params).length > 0) {
            Object.assign(this.customParams, params)
        } else {
            this.customParams = {};
        }

        return this;
    }

    setUserProperties(upValue?: Record<string, unknown>) {
        if (typeof upValue === 'object' && Object.keys(upValue).length > 0) {
            this.userProperties = upValue;
        } else {
            this.userProperties = null;
        }

        return this;
    }

    event(eventName: string): Promise<any> {
        const payload = {
            client_id: this.clientID,
            events: [
                {
                    name: eventName,
                    params: {
                        session_id: this.sessionID,
                        ...this.customParams,
                    },
                },
            ],
        };

        if(this.userProperties) {
            Object.assign(payload, {user_properties: this.userProperties})
        }

        return fetch(
                `${this.baseURL}${this.collectURL}?measurement_id=${this.trackingID}&api_secret=${this.secretKey}`,
                {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }
            )
    };

    trace(eventName: string, params?: Record<string, unknown>) {
        this.setParams();
        this.setParams(params);
        this.event(eventName);
        this.setParams();
    }
}

let gaInstance: Analytics4 = null;
export const loadGA = () => {
    if (gaInstance) {
        return gaInstance;
    }
    gaInstance = new Analytics4('G-L8EE6ZNNG6', 's_RUrczOQYa99d7O-o8D7w');

    gaInstance.setParams();
    gaInstance.setUserProperties();
    gaInstance.event('trace_init');
    return gaInstance;
}

