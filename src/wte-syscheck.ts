#!/usr/bin/env node
/**
 * @author Matthew Evans
 * @module wtfsystems/wtengine-tools
 * @see README.md
 * @copyright MIT see LICENSE.md
 */

import { lookpathSync } from 'find-bin'
import { red, green } from 'kolorist'
import * as wtf from './_common.js'

wtf.scriptTitle(`WTEngine System Check Utility`)

let res = 0

wtf.config.checkApps.forEach((app:string) => {
  if(lookpathSync(app)) {
    console.log(green(`Command '${app}' found`))
  } else {
    console.log(red(`Command '${app}' not found!`))
    res = 1
  }
})

process.exit(res)
