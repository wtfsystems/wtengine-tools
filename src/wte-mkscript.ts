#!/usr/bin/env node
/**
 * @author Matthew Evans
 * @module wtfsystems/wtengine
 * @see README.md
 * @copyright MIT see LICENSE.md
 */

import fs from 'node:fs'
import { Buffer } from 'node:buffer'

import minimist from 'minimist'
import * as csv from 'csv/sync'
import { dim, cyan } from 'kolorist'

import { scriptError } from '@spongex/script-error'
import * as wtf from './_common.js'

const SAVE_FILE_VERSION = 'v0.9.0'

wtf.scriptTitle(`WTEngine Make Script Utility`)

/*
 * Process command arguments
 */
const argv = minimist(process.argv.slice(2))

const inFile = argv._[0]
if (inFile === undefined) scriptError('Please specify an input file!')
if(inFile.split('.')[1] === undefined || inFile.split('.')[1] !== 'sdf')
  scriptError(`Unable to determine file type!  Extension type must be '.sdf'`)

const outFile = (() => {
  if (argv._[1] === undefined) return inFile.split('.')[0] += '.sdf'
  if (argv._[1].split('.')[1] === undefined) return argv._[1] += '.sdf'
  else return argv._[1]
})()

if (!fs.existsSync(inFile)) scriptError(`Input file '${inFile}' does not exist.`)
await (async () => {
  if (fs.existsSync(outFile) &&
      !await wtf.confirmPrompt(`Output file '${outFile}' exists, overwrite?`))
    scriptError(`Output file '${outFile}' already exists!`)
})()

/*
 * Parse the input file
 */
console.log(`Parsing data file '${inFile}'...\n`)
const gameData:any = (() => {
  switch (inFile.split('.')[1].toLowerCase()) {
    /* CSV file data */
    case 'csv':
      return csv.parse(fs.readFileSync(inFile))
    /* JSON file data */
    case 'json':
      let gameData:any = []
      {const tempData = JSON.parse(fs.readFileSync(inFile).toString())
      Object.keys(tempData).forEach(key => { gameData.push(tempData[key]) })}
      return gameData
    /* Unsupported file types */
    default:
      scriptError(`File format '${inFile.split('.')[1]}' not supported!`)
  }
})()

if(gameData === null || !(gameData instanceof Array))
  scriptError('Parsing game data failed!')

console.log(`Parsed datafile '${inFile}.'`)
console.log(`${gameData.length} rows read.\n`)

/*
 * Generate the data file buffer
 */
console.log(`Generating game data file '${outFile}'...`)

const fileHeader = Buffer.from('46445300', 'hex')   //  Header to identify file
const fileVersion = Buffer.from(SAVE_FILE_VERSION)  //  Save file version

let rowCounter = Number(0)        //  Row counter for error reporting
let dataBuffer = Buffer.alloc(0)  //  Buffer to store binary file

gameData.forEach((row:any) => {
  rowCounter++
  if(row.length !== 6) scriptError(`Row ${rowCounter}: incorrect length!`)

  //  Write each message:  timer / sys / to / from / cmd / arg
  const timerBuffer = Buffer.alloc(8)
  timerBuffer.writeBigInt64LE(BigInt.asIntN(64, row[0]))
  dataBuffer = Buffer.concat([dataBuffer, Buffer.concat([
    timerBuffer, Buffer.from(
      row[1] + '\x00' + row[2] + '\x00' + row[3] + '\x00' +
      row[4] + '\x00' + row[5] + '\x00'
    )
  ])])
})

//  Verify data generated
if (Buffer.byteLength(dataBuffer, 'utf8') === 0 || rowCounter === 0)
  scriptError('No data generated!')

//  Create final output buffer
const commandCount = Buffer.alloc(4)
commandCount.writeUInt8(rowCounter)

const outBuffer = Buffer.concat([
  fileHeader, fileVersion, commandCount, dataBuffer
])

/*
 * Write out the data file buffer
 */
try {
  fs.writeFileSync(outFile, outBuffer)
  console.log(`\nWrote data file '${outFile}'\n${rowCounter} total commands.`)
  console.log(`Size: ${Buffer.byteLength(outBuffer, 'utf8')} bytes.\n`)
} catch (error:any) { scriptError(error.message) }

console.log(dim(cyan(`Script conversion done!\n`)))
process.exit(0)
