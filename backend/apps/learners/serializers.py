from rest_framework import serializers

from .models import Learner


class LearnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Learner
        fields = "__all__"
