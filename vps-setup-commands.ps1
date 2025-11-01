# VPS Setup Commands for 31.97.51.129
# Execute these commands after SSH login to VPS

Write-Host "=== VPS Setup Commands for 31.97.51.129 ===" -ForegroundColor Green
Write-Host ""

Write-Host "Files have been uploaded successfully!" -ForegroundColor Green
Write-Host "Now execute these commands on VPS:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. SSH to VPS:" -ForegroundColor Cyan
Write-Host "   ssh root@31.97.51.129" -ForegroundColor White
Write-Host ""

Write-Host "2. Make backup scripts executable:" -ForegroundColor Cyan
Write-Host "   chmod +x /root/backup-lodge-family.sh" -ForegroundColor White
Write-Host "   chmod +x /root/restore-lodge-family.sh" -ForegroundColor White
Write-Host "   chmod +x /root/setup-backup-cron.sh" -ForegroundColor White
Write-Host ""

Write-Host "3. Verify uploaded files:" -ForegroundColor Cyan
Write-Host "   ls -la /etc/nginx/conf.d/nginx-*.conf" -ForegroundColor White
Write-Host "   ls -la /etc/nginx/conf.d/ssl-*.conf" -ForegroundColor White
Write-Host "   ls -la /root/*.sh" -ForegroundColor White
Write-Host ""

Write-Host "4. Test Nginx configuration:" -ForegroundColor Cyan
Write-Host "   nginx -t" -ForegroundColor White
Write-Host ""

Write-Host "5. If test passes, reload Nginx:" -ForegroundColor Cyan
Write-Host "   systemctl reload nginx" -ForegroundColor White
Write-Host ""

Write-Host "6. Setup automated backup:" -ForegroundColor Cyan
Write-Host "   /root/setup-backup-cron.sh" -ForegroundColor White
Write-Host ""

Write-Host "7. Verify services status:" -ForegroundColor Cyan
Write-Host "   systemctl status nginx" -ForegroundColor White
Write-Host "   systemctl status pm2-root" -ForegroundColor White
Write-Host ""

Write-Host "8. Test website and API:" -ForegroundColor Cyan
Write-Host "   curl -I https://family.thelodgegroup.id" -ForegroundColor White
Write-Host "   curl https://family.thelodgegroup.id/api" -ForegroundColor White
Write-Host ""

Write-Host "9. Check security headers:" -ForegroundColor Cyan
Write-Host "   curl -I https://family.thelodgegroup.id | grep -i 'x-frame-options\|x-content-type-options\|x-xss-protection'" -ForegroundColor White
Write-Host ""

Write-Host "10. Verify SSL certificate:" -ForegroundColor Cyan
Write-Host "    openssl s_client -connect family.thelodgegroup.id:443 -servername family.thelodgegroup.id | grep 'Verify return code'" -ForegroundColor White
Write-Host ""

Write-Host "=== Troubleshooting ===" -ForegroundColor Yellow
Write-Host "If Nginx test fails:" -ForegroundColor Red
Write-Host "- Check syntax: nginx -t" -ForegroundColor White
Write-Host "- View error logs: tail -f /var/log/nginx/error.log" -ForegroundColor White
Write-Host "- Disable problematic config temporarily" -ForegroundColor White
Write-Host ""

Write-Host "If backup setup fails:" -ForegroundColor Red
Write-Host "- Check script permissions: ls -la /root/*.sh" -ForegroundColor White
Write-Host "- Run manually: /root/setup-backup-cron.sh" -ForegroundColor White
Write-Host "- Check cron: crontab -l" -ForegroundColor White
Write-Host ""

Write-Host "Ready to proceed with VPS configuration!" -ForegroundColor Green