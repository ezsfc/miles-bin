#!/usr/bin/env node
'use strict'

const endpoint = 'https://www.ana.co.jp/ja/jp/amc/reference/tameru/flightmile/dom/chart.html'
const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'


const cheerio = require('cheerio')
const got = require('got')
const v = require('voca')
const _ = require('lodash')
const numeral = require('numeral')

const airports = require('@ezsfc/airports')


async function fetch() {
  const headers = { 'User-Agent': ua }
  const { body } = await got(endpoint, headers)
  const $ = cheerio.load(body)
  const contents = $('#contents .toggle-box')
    .toArray()
    .map(content => {
      const origin = v($('h3', content).text())
        .trim()
        .replace('発着路線', '')
        .value()
      const routes = $('tr', content)
        .toArray()
        .filter(el => $('th', el).length === 0)
        .map(el => {
          const destination = v.trim($('td:first-of-type', el).text())
          const miles = $('td:nth-of-type(n+2)', el)
            .toArray()
            .map(el => v.trim($(el).text()))
            .map(text => numeral(text).value())
          return { destination, miles }
        })
      return { origin, routes }
    })
  return contents
}


function transform(contents) {
  return _(contents)
    .map(content => {
      const origins = airports.filterByKeyword(content.origin)
      return origins.map(({ iata: origin }) => {
        return content.routes.map(route => {
          const destinations = airports.filterByKeyword(route.destination)
          return destinations.map(({ iata: destination }) => ({
            origin,
            destination,
            miles: route.miles,
          }))
        })
      })
    })
    .flattenDeep()
    .value()
}


!async function() {
  try {
    const contents = await fetch()
    const routes = transform(contents)
    console.log(JSON.stringify(routes, null, '  '))
  } catch (err) {
    console.error(err)
  }
}()

// vim: se sw=2 ts=2 sts=2 et ft=javascript :
