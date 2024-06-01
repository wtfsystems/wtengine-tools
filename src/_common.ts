/**
 * 
 * @author Matthew Evans
 * @module wtfsystems/wtengine
 * @see README.md
 * @copyright MIT see LICENSE.md
 * 
 */

import fs from 'node:fs'
import path from 'node:path'
//import { exec } from 'node:child_process'
import inquirer from 'inquirer'
import { dim, green, yellow, cyan } from 'kolorist'

import { scriptError } from '@spongex/script-error'

const packageJSON = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, '..', 'package.json')).toString()
)

/**
 * Configuration settings
 */
export const config = {
  checkApps: [ "cmake", "git" ],
  gitURLs: [
    { name: "allegro5", url: "https://github.com/liballeg/allegro5" },
    { name: "physfs", url: "https://github.com/icculus/physfs" }
  ]
}

/**
 * Constants
 */
export const scriptInfo = {
  NAME:     packageJSON['name'],
  VERSION:  packageJSON['version'],
  URL:      packageJSON['homepage']
}

/**
 * PROJECT class
 * Used for setting the project root location
 * Must be set before referencing the path variables below
 */
export class PROJECT {
  /** Root location of the project */
  static #ROOT_LOCATION = ''
  /** Get the root location */
  static get ROOT_LOCATION():string { return PROJECT.#ROOT_LOCATION }
  /** Set the root location */
  static set ROOT_LOCATION(val:string) { PROJECT.#ROOT_LOCATION = val }
}

/**
 * Folder paths
 */
export const paths = {
  ENGINE_BUILD_LOCATION:       path.join(PROJECT.ROOT_LOCATION, 'wte-build'),
  ENGINE_BUILD_DEBUG_LOCATION: path.join(PROJECT.ROOT_LOCATION, 'wte-build-debug'),
  ENGINE_LOG_LOCATION:         path.join(PROJECT.ROOT_LOCATION, 'wte-logs'),
  ENGINE_TEMP_LOCATION:        path.join(PROJECT.ROOT_LOCATION, 'wte-temp')
}

/**
 * Files
 */
export const files = {
  CONFIG_SCRIPT:    path.join(import.meta.dirname, 'wte-config.js'),
  SYSCHECK_SCRIPT:  path.join(import.meta.dirname, 'wte-syscheck.js'),
  SETTINGS_FILE:    path.join(PROJECT.ROOT_LOCATION, 'settings.json'),
  LOG_FILE: ``      //  Set by script
}

/**
 * Show script info
 * @param title Script title to use
 */
export const scriptTitle = (title:string):void => {
  console.log(`${cyan(`${title}`)} - ` +
    dim(cyan(`${scriptInfo.NAME}`)) + ` - ` +
    dim(cyan(`ver ${scriptInfo.VERSION}`)))
  console.log(dim(yellow(`${scriptInfo.URL}\n`)))
}

/**
 * Clears the log file.
 * Will exit script if the log filename was not set.
 */
export const clearLog = ():void => {
  if(files.LOG_FILE === '') scriptError(`Must set a log file in the script first!`)
  try {
    fs.unlinkSync(`${paths.ENGINE_LOG_LOCATION}/${files.LOG_FILE}`)
  } catch (error:any) {}
}

/**
 * Write a message to the log file.
 * Will exit script if the log filename was not set.
 * @param message String to write.
 * @throws Error on fail then exits script.
 */
export const writeLog = (message:string):void => {
  if(files.LOG_FILE === '') scriptError(`Must set a log file in the script first!`)
  try {
    fs.appendFileSync(`${paths.ENGINE_LOG_LOCATION}/${files.LOG_FILE}`, message)
  } catch (error:any) { scriptError(error.message) }
}

/**
 * Confirmation prompt
 * @param message Message to display.
 * @param dvalue Default answer (Y - true | N - false)
 * @returns True if default answer, else false
 */
export const confirmPrompt = async (message:string, dvalue?:boolean):Promise<boolean> => {
  if(dvalue == undefined) dvalue = true
  return await inquirer.prompt([{
    default: dvalue,
    name: 'conf',
    type: 'confirm',
    message: yellow(`${message}`)
  }]).then(res => { return res.conf })
}

/**
 * Check if a folder exists
 * @param folder 
 * @returns True if the folder exists, else false.
 */
export const checkFolder = (folder:string):boolean => {
  try { fs.accessSync(folder) } catch (error:any) { return false }
  return true
}

/**
 * Check if a folder exists, then create it if one does not
 * @param folder 
 * @throws Error on fail then exits script
 */
export const makeFolder = (folder:string):void => {
  try {
    fs.accessSync(folder)
  } catch (error:any) {
    try {
      fs.mkdirSync(folder)
    } catch (error:any) { scriptError(error.message) }
  }
}

/**
 * Verify access to engine settings file.  Passing nothing checks if the file simply exists.
 * @param permissions File permissions to check, 'rwx' format.
 * @returns True if tests succeded, else false
 */
export const checkSettings = (permissions:string):boolean => {
  let checkFlags = []
  if(permissions === undefined) checkFlags.push(fs.constants.F_OK)
  else {
    if(permissions.includes("r") || permissions.includes("R")) checkFlags.push(fs.constants.R_OK)
    if(permissions.includes("w") || permissions.includes("W")) checkFlags.push(fs.constants.W_OK)
    if(permissions.includes("x") || permissions.includes("X")) checkFlags.push(fs.constants.X_OK)
  }

  if(checkFlags.length == 0) scriptError(`Unable to check settings file!  No proper tests requested!`)

  let result = true
  checkFlags.forEach(fFlag => {
    try { fs.accessSync(files.SETTINGS_FILE, fFlag)
    } catch (err) { result = false }
  })
  return result
}

/**
 * Load engine settings.
 * @returns Settings JSON object.  False on fail.
 */
export const loadSettings = ():string | boolean => {
  try {
    return JSON.parse(fs.readFileSync(files.SETTINGS_FILE).toString())
  } catch (error:any) {
    return false
  }
}

/**
 * Save engine settings.
 * @param settings Settings as JSON object.
 * On fail, display error and exit running script.
 */
export const saveSettings = (settings:JSON) => {
  if(!(settings instanceof Object)) scriptError(`Settings format not valid.`)

  try {
    fs.writeFileSync(files.SETTINGS_FILE, JSON.stringify(settings))
    console.log(green(`Settings saved.`))
  } catch (error:any) {
    scriptError(error.message)
  }
}

/*interface runCommandOpts {
  cwd:string
  env:ProcessEnv
  timeout:number
  log:boolean
}*/

/**
 * Run a system command.
 * Waits for the command to complete but does not show output.
 * @param cmd Command to run.
 * @param opts Additional options.
 * @param log Log the result of the command to the log file.  Defaults to true.
 * @returns True if the command was successful, else false.
 */
/*export const runCommand = async (cmd:string, opts:runCommandOpts) => {
  opts = opts || {}
  opts.cwd = opts.cwd || process.cwd()
  opts.env = opts.env || process.env
  opts.timeout = opts.timeout || 0
  opts.log = opts.log || true

  if(log) writeLog(`Running command:  ${cmd}\n`)

  return await new Promise ((resolve, reject) => {
    const proc = exec(cmd, opts, (error, stdout, stderr) => {
      if(opts.log) {
        if(stdout != ``) writeLog(`Output:  ${stdout}\n`)
        if(stderr != ``) writeLog(`Output:  ${stderr}\n`)
      }
      if(error) resolve(false)
      resolve(true)
    })
  })
}*/

/**
 * Wait for a process to exit and return the result.
 * @param process The process object to watch.
 * @returns A fulfilled promise with the result.
 */
/*export const onProcessExit = async (proc, log) => {
  log = log || false
  return new Promise((resolve, reject) => {
    proc.once('exit', (code) => {
      if(log) writeLog(`Return code:  ${code}\n`)
      if(code === 0) resolve(true)
      else resolve(false)
    })
    proc.once('error', (error) => {
      if(log) writeLog(`Error:  ${error.message}\n`)
      reject(error)
    })
  })
}*/
