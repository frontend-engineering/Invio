import { Vault, requestUrl, RequestUrlParam } from "obsidian";
import InvioPlugin from "./main";

// const param: RequestUrlParam = {
//     body: transformedBody,
//     headers: transformedHeaders,
//     method: method,
//     url: url,
//     contentType: contentType,
//   };

  // Check hosting service
  export const checkRemoteHosting = async (plugin: InvioPlugin) => {
    const curDir = plugin.settings.localWatchDir;
    if (!curDir) {
      return false;
    }
    const token = plugin.settings.token;
    if (!token) {
      throw new Error('NoAuth');
    }
    return fetch(`http://localhost:8888/api/invio?priatoken=${token}`)
        .then(resp => resp.json())
        .then(resp => {
            console.log('projects: ', resp);
            if (resp?.find((p: any) => p.name === curDir)) {
                return true;
            }
            return false;
        });
  }
