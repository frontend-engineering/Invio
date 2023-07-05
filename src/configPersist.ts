import { base64, base64url } from "rfc4648";
import { reverseString } from "./misc";

import type { InvioPluginSettings } from "./baseTypes";

import { log } from "./moreOnLog";

const DEFAULT_README: string =
  "The file contains sensitive info, so DO NOT take screenshot of, copy, or share it to anyone! It's also generated automatically, so do not edit it manually.";

interface MessyConfigType {
  readme: string;
  d: string;
}

/**
 * this should accept the result after loadData();
 */
export const messyConfigToNormal = (
  x: MessyConfigType | InvioPluginSettings | null | undefined
): InvioPluginSettings | null | undefined => {
  // log.debug("loading, original config on disk:");
  // log.debug(x);
  if (x === null || x === undefined) {
    log.debug("the messy config is null or undefined, skip");
    return x as any;
  }
  if ("readme" in x && "d" in x) {
    // we should decode
    const y = JSON.parse(
      (
        base64url.parse(reverseString(x["d"]), {
          out: Buffer.allocUnsafe as any,
          loose: true,
        }) as Buffer
      ).toString("utf-8")
    );
    // log.debug("loading, parsed config is:");
    // log.debug(y);
    return y;
  } else {
    // return as is
    // log.debug("loading, parsed config is the same");
    return x;
  }
};

/**
 * this should accept the result of original config
 */
export const normalConfigToMessy = (
  x: InvioPluginSettings | null | undefined
) => {
  if (x === null || x === undefined) {
    log.debug("the normal config is null or undefined, skip");
    return x;
  }
  const y = {
    readme: DEFAULT_README,
    d: reverseString(
      base64url.stringify(Buffer.from(JSON.stringify(x), "utf-8"), {
        pad: false,
      })
    ),
  };
  // log.debug("encoding, encoded config is:");
  // log.debug(y);
  return y;
};
