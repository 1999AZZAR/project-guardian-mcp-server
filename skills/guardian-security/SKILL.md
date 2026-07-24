---
name: guardian-security
description: Scan project files for likely hardcoded secrets and inspect container images for HIGH or CRITICAL CVEs with Trivy. Use for local security audits before commits, releases, or deployments; treat findings as heuristics requiring review.
---

# Guardian Security

Local security auditing for credentials and container vulnerabilities.

## Core Workflows

### 1. Secret Scanning
Scan specific project directories for hardcoded credentials. 
- **Tool**: `scripts/scan_secrets.py`
- **Usage**: `python3 $WORKSPACE/skills/guardian-security/scripts/scan_secrets.py <path_to_project>`
- **Workflow**:
    1. Execute scan on a specific project or directory.
    2. If findings are reported (exit code 1):
        - Review the file and line number.
        - **Transition**: Move the secret to a secure vault (e.g., using the `mema-vault` skill).
        - **Redact**: Replace the plaintext secret in the source code with an environment variable or a vault lookup call.

### 2. Container Vulnerability Scan
Analyze Docker images for vulnerabilities prior to deployment.
- **Tool**: `scripts/scan_container.sh`
- **Usage**: `bash $WORKSPACE/skills/guardian-security/scripts/scan_container.sh <image_name>`
- **Logic**: Identify `HIGH` and `CRITICAL` severities. Recommend base image updates or security patches.

## Security Guardrails
- **Scope Limitation**: Avoid scanning system-level directories. Focus only on relevant project workspaces.
- **Credential Isolation**: Hardcoded secrets are considered a high-severity finding.
- **Output Safety**: Report locations and secret types only; never print matched secret values.
- **Failure Handling**: Treat scanner errors and unreadable inputs as incomplete audits, not clean results.
- **Dependencies**: Container scanning requires `trivy` to be installed on the host system.

## Integration
- **Vaulting**: This skill identifies leaks. Remediation should be performed using a dedicated credential manager like `mema-vault`.
