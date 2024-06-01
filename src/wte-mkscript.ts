#!/usr/bin/env node
/**
 * @author Matthew Evans
 * @module wtfsystems/wtengine
 * @see README.md
 * @copyright MIT see LICENSE.md
 */

import fs from 'node:fs'
import { Buffer } from 'node:buffer'
import * as csv from 'csv/sync'
import { dim, cyan } from 'kolorist'

import { scriptError } from '@spongex/script-error'
import * as wtf from './_common.js'

wtf.scriptTitle(`WTEngine Make Script Utility`)

/*
 * Process command arguments
 */
const args = process.argv.slice(2)
if(args[0] === undefined) scriptError('Please specify an input file.')
if(!fs.existsSync(args[0])) scriptError(`Input file '${args[0]}' does not exist.`)
if(args[1] === undefined) args[1] = args[0].split('.')[0]
if(args[1].split('.')[1] === undefined) args[1] += '.sdf'
if(fs.existsSync(args[1]) && !wtf.confirmPrompt(`Output file '${args[1]}' exists, overwrite?`))
  scriptError(`Output file '${args[1]}' already exists.`)

/*
 * Parse the input file
 */
console.log(`Parsing data file '${args[0]}'...\n`)
let gameData:any = null

switch(args[0].split('.')[1].toLowerCase()) {
  /* CSV file data */
  case 'csv':
    gameData = csv.parse(fs.readFileSync(args[0]))
    break
  /* JSON file data */
  case 'json':
    gameData = []
    {const tempData = JSON.parse(fs.readFileSync(args[0]).toString())
    Object.keys(tempData).forEach(key => { gameData.push(tempData[key]) })}
    break
  /* Unsupported file types */
  default:
    scriptError(`File format '${args[0].split('.')[1]}' not supported.`)
}

if(gameData == null || !(gameData instanceof Array))
  scriptError('Parsing game data failed.')

console.log(`Parsed datafile '${args[0]}.'`)
console.log(`${gameData.length} rows read.\n`)

/*
 * Generate the data file buffer
 */
console.log(`Generating game data file '${args[1]}'...`)
let rowCounter = Number(0)        //  Row counter for error reporting
let dataBuffer = Buffer.alloc(0)  //  Buffer to store binary file
gameData.forEach((row:any) => {
  rowCounter++
  if(row.length !== 6) scriptError(`Row ${rowCounter}: incorrect length.`)

  //  Write each message:  timer / sys / to / from / cmd / args
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
if(Buffer.byteLength(dataBuffer, 'utf8') == 0)
  scriptError('No data generated.')

/*
 * Write out the data file buffer
 */
try {
  fs.writeFileSync(args[1], dataBuffer)
  console.log(`\nWrote data file '${args[1]}'\n${rowCounter} total commands.`)
  console.log(`Size: ${Buffer.byteLength(dataBuffer, 'utf8')} bytes.\n`)
} catch (error:any) { scriptError(error.message) }

console.log(dim(cyan(`Script conversion done!\n`)))
process.exit(0)
