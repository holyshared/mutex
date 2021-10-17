terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "3.79.0"
    }
  }
}

provider "google" {
  region = var.location
}

module "project-factory" {
  source  = "terraform-google-modules/project-factory/google"
  version = "11.1.1"

  name              = "gcs-mutex-lock"
  random_project_id = true
  org_id            = var.org_id
  billing_account   = var.billing_account
  folder_id         = var.folder_id

  activate_apis = [
    "iam.googleapis.com",
    "storage.googleapis.com"
  ]
}

resource "google_service_account" "mutex_lock_service_account" {
  project      = module.project-factory.project_id
  account_id   = "mutex-locks"
  display_name = "mutex locks"
}

resource "google_project_iam_member" "mutex_lock_service_account_user" {
  project = module.project-factory.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.mutex_lock_service_account.email}"
}

resource "google_project_iam_member" "mutex_lock_object_administrator" {
  project = module.project-factory.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.mutex_lock_service_account.email}"
}

resource "google_storage_bucket" "mutex_locks" {
  project  = module.project-factory.project_id
  name     = "mutex-locks-${module.project-factory.project_id}"
  location = var.location

  force_destroy = true

  lifecycle_rule {
    condition {
      age = 1
    }
    action {
      type = "Delete"
    }
  }
}
