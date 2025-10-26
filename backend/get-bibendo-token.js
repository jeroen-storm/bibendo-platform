#!/usr/bin/env node
/**
 * Bibendo Bearer Token Fetcher
 *
 * Usage:
 *   node get-bibendo-token.js
 *
 * Je wordt gevraagd om je email en wachtwoord.
 * Het script logt in op make.bibendo.nl en haalt de Bearer token op.
 */

const fetch = require('node-fetch');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt function that returns a promise
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Hide password input
function promptPassword(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';
    stdin.on('data', function onData(char) {
      char = char.toString('utf8');

      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl-D
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl-C
          process.exit();
          break;
        case '\u007f': // Backspace
          password = password.slice(0, -1);
          stdout.clearLine();
          stdout.cursorTo(0);
          stdout.write(question + '*'.repeat(password.length));
          break;
        default:
          password += char;
          stdout.write('*');
          break;
      }
    });
  });
}

async function getBibendoToken() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║     Bibendo Bearer Token Fetcher                 ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  try {
    // Get credentials
    const email = await prompt('Email: ');
    const password = await promptPassword('Wachtwoord: ');

    console.log('\n🔄 Inloggen op make.bibendo.nl...\n');

    // Attempt login to Bibendo
    // Note: Dit is een placeholder - de exacte login flow moet mogelijk aangepast worden
    const loginResponse = await fetch('https://api.bibendo.nl/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    if (!loginResponse.ok) {
      console.error('❌ Login mislukt:', loginResponse.status, loginResponse.statusText);

      // Try alternative login endpoint
      console.log('\n🔄 Probeer alternatief login endpoint...\n');

      const altLoginResponse = await fetch('https://api.bibendo.nl/account/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      if (!altLoginResponse.ok) {
        console.error('❌ Alternatief login ook mislukt:', altLoginResponse.status);
        console.log('\n⚠️  De login endpoints zijn mogelijk anders.');
        console.log('📋 Handmatige stappen:');
        console.log('   1. Open https://make.bibendo.nl in je browser');
        console.log('   2. Log in met je credentials');
        console.log('   3. Open Developer Tools (F12)');
        console.log('   4. Ga naar Network tab');
        console.log('   5. Ververs de pagina');
        console.log('   6. Zoek een API call naar api.bibendo.nl');
        console.log('   7. Kopieer de Bearer token uit de Authorization header\n');
        rl.close();
        return;
      }

      const altData = await altLoginResponse.json();
      console.log('✅ Login succesvol (alternatief endpoint)!\n');

      if (altData.token || altData.access_token || altData.bearer) {
        const token = altData.token || altData.access_token || altData.bearer;
        console.log('╔═══════════════════════════════════════════════════╗');
        console.log('║     Bearer Token                                  ║');
        console.log('╚═══════════════════════════════════════════════════╝\n');
        console.log(token);
        console.log('\n📋 Kopieer deze token en plak hem in de test interface!\n');
      } else {
        console.log('Response data:', JSON.stringify(altData, null, 2));
        console.log('\n⚠️  Token niet gevonden in response. Zie data hierboven.\n');
      }

      rl.close();
      return;
    }

    const data = await loginResponse.json();
    console.log('✅ Login succesvol!\n');

    // Extract token from response
    if (data.token || data.access_token || data.bearer) {
      const token = data.token || data.access_token || data.bearer;

      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('║     Bearer Token                                  ║');
      console.log('╚═══════════════════════════════════════════════════╝\n');
      console.log(token);
      console.log('\n📋 Kopieer deze token en plak hem in de test interface!\n');

      // Save to file for easy access (optional)
      const fs = require('fs');
      fs.writeFileSync('.bibendo-token-temp.txt', token);
      console.log('💾 Token ook opgeslagen in: .bibendo-token-temp.txt\n');

    } else {
      console.log('Response data:', JSON.stringify(data, null, 2));
      console.log('\n⚠️  Token niet gevonden in response. Zie data hierboven.\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n📋 Handmatige stappen als alternatief:');
    console.log('   1. Open https://make.bibendo.nl in je browser');
    console.log('   2. Log in met je credentials');
    console.log('   3. Open Developer Tools (F12)');
    console.log('   4. Ga naar Network tab');
    console.log('   5. Ververs de pagina');
    console.log('   6. Zoek een API call naar api.bibendo.nl');
    console.log('   7. Kopieer de Bearer token uit de Authorization header\n');
  } finally {
    rl.close();
  }
}

// Run the script
getBibendoToken();
