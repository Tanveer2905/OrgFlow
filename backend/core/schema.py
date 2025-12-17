import graphene
from graphene_django import DjangoObjectType
import graphql_jwt
from django.contrib.auth.models import User
from django.utils.text import slugify
from .models import Organization, Project, Task, TaskComment

# --- Types ---
class UserType(DjangoObjectType):
    class Meta:
        model = User
        fields = ("id", "username", "email")

class OrganizationType(DjangoObjectType):
    class Meta:
        model = Organization
        fields = "__all__"
    
    projects = graphene.List(lambda: ProjectType)
    # NEW: Expose admin status to frontend
    is_admin = graphene.Boolean()

    def resolve_projects(self, info):
        return Project.objects.filter(organization=self)

    def resolve_is_admin(self, info):
        # Returns True if the logged-in user is the owner of this organization
        return self.owner == info.context.user

class TaskCommentType(DjangoObjectType):
    class Meta:
        model = TaskComment
        fields = "__all__"

class TaskType(DjangoObjectType):
    class Meta:
        model = Task
        fields = "__all__"

class ProjectType(DjangoObjectType):
    class Meta:
        model = Project
        fields = "__all__"
    
    task_count = graphene.Int()
    completion_rate = graphene.Float()

    def resolve_task_count(self, info):
        return self.tasks.count()

    def resolve_completion_rate(self, info):
        total = self.tasks.count()
        if total == 0: return 0.0
        completed = self.tasks.filter(status='DONE').count()
        return (completed / total) * 100

# --- Queries ---
class Query(graphene.ObjectType):
    # Fetch the logged-in user's organization (assuming 1 org per user for simplicity)
    my_organization = graphene.Field(OrganizationType)
    
    # Fetch a specific project (secured)
    project = graphene.Field(ProjectType, id=graphene.ID(required=True))
    
    # Check if user is logged in
    me = graphene.Field(UserType)
    
    # Allow fetching all orgs (useful if you want to switch context in future)
    all_organizations = graphene.List(OrganizationType)

    def resolve_me(self, info):
        user = info.context.user
        if user.is_authenticated:
            return user
        return None

    def resolve_my_organization(self, info):
        user = info.context.user
        if not user.is_authenticated:
            return None
        # Return the first organization the user is a member of
        return user.organizations.first()

    def resolve_project(self, info, id):
        user = info.context.user
        if not user.is_authenticated:
            raise Exception("Not logged in")
        
        try:
            project = Project.objects.get(pk=id)
            # Security Check: Ensure user is member of project's org
            if user not in project.organization.members.all():
                raise Exception("Access Denied")
            return project
        except Project.DoesNotExist:
            return None

    def resolve_all_organizations(self, info):
        return Organization.objects.all()

# --- Mutations ---

# 1. Custom Register Mutation
class Register(graphene.Mutation):
    class Arguments:
        username = graphene.String(required=True)
        password = graphene.String(required=True)
        email = graphene.String(required=True)
        organization_name = graphene.String(required=True)

    user = graphene.Field(UserType)
    organization = graphene.Field(OrganizationType)
    token = graphene.String()

    def mutate(self, info, username, password, email, organization_name):
        # 1. Create User
        if User.objects.filter(username=username).exists():
            raise Exception("Username already exists")
        
        user = User.objects.create_user(username=username, email=email, password=password)
        
        # 2. Handle Organization
        slug = slugify(organization_name)
        
        try:
            # Try to join existing org
            org = Organization.objects.get(slug=slug)
        except Organization.DoesNotExist:
            # Create NEW org and set current user as OWNER
            org = Organization.objects.create(name=organization_name, slug=slug, owner=user)
        
        # 3. Link User to Org
        org.members.add(user)
        org.save()

        # 4. Generate Token
        from graphql_jwt.shortcuts import get_token
        token = get_token(user)

        return Register(user=user, organization=org, token=token)

class CreateProject(graphene.Mutation):
    class Arguments:
        org_slug = graphene.String(required=True)
        name = graphene.String(required=True)
        description = graphene.String()
        due_date = graphene.String()

    project = graphene.Field(ProjectType)

    def mutate(self, info, org_slug, name, description="", due_date=None):
        org = Organization.objects.get(slug=org_slug)
        if due_date == "": due_date = None
        project = Project.objects.create(organization=org, name=name, description=description, due_date=due_date)
        return CreateProject(project=project)

class UpdateTask(graphene.Mutation):
    class Arguments:
        task_id = graphene.ID(required=True)
        status = graphene.String()
        description = graphene.String()
        assignee_email = graphene.String()
        due_date = graphene.String()

    task = graphene.Field(TaskType)

    def mutate(self, info, task_id, status=None, description=None, assignee_email=None, due_date=None):
        task = Task.objects.get(pk=task_id)
        user = info.context.user

        # SECURITY CHECK: Only Admin/Owner can assign tasks
        if assignee_email is not None:
            # Check if organization has an owner and if the current user is NOT that owner
            if task.project.organization.owner and task.project.organization.owner != user:
                raise Exception("Only the Organization Admin can assign tasks.")
            task.assignee_email = assignee_email

        if status: task.status = status
        if description is not None: task.description = description
        if due_date is not None: task.due_date = None if due_date == "" else due_date
        
        task.save()
        return UpdateTask(task=task)

class UpdateProject(graphene.Mutation):
    class Arguments:
        project_id = graphene.ID(required=True)
        status = graphene.String()
    project = graphene.Field(ProjectType)
    def mutate(self, info, project_id, status):
        project = Project.objects.get(pk=project_id)
        project.status = status
        project.save()
        return UpdateProject(project=project)

class CreateTask(graphene.Mutation):
    class Arguments:
        project_id = graphene.ID(required=True)
        title = graphene.String(required=True)
    task = graphene.Field(TaskType)
    def mutate(self, info, project_id, title):
        project = Project.objects.get(pk=project_id)
        task = Task.objects.create(project=project, title=title)
        return CreateTask(task=task)

class AddComment(graphene.Mutation):
    class Arguments:
        task_id = graphene.ID(required=True)
        content = graphene.String(required=True)

    comment = graphene.Field(TaskCommentType)

    def mutate(self, info, task_id, content):
        user = info.context.user
        if not user.is_authenticated:
            raise Exception("You must be logged in to comment.")

        task = Task.objects.get(pk=task_id)
        
        # Create comment linked to the logged-in user
        comment = TaskComment.objects.create(
            task=task, 
            content=content, 
            author=user
        )
        return AddComment(comment=comment)

class Mutation(graphene.ObjectType):
    token_auth = graphql_jwt.ObtainJSONWebToken.Field() # Built-in Login
    verify_token = graphql_jwt.Verify.Field()
    refresh_token = graphql_jwt.Refresh.Field()
    register = Register.Field() # Custom Register
    
    # Existing project mutations
    create_project = CreateProject.Field()
    update_project = UpdateProject.Field()
    create_task = CreateTask.Field()
    update_task = UpdateTask.Field()
    add_comment = AddComment.Field()