from django.db import models
from django.conf import settings


class GuidanceLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='guidance_logs')
    message = models.TextField()
    tip_type = models.CharField(max_length=50, default='general')
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-generated_at']

    def __str__(self):
        return f"Tip for {self.user.username}: {self.message[:60]}"
