from rest_framework import serializers

from .models import School, SchoolContact, SchoolGraduationWorkflow, Teacher


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = "__all__"


class SchoolContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolContact
        fields = "__all__"


class TeacherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Teacher
        fields = "__all__"


class SchoolGraduationWorkflowSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolGraduationWorkflow
        fields = "__all__"
