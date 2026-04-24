"""
ResQ ML -- Deep Learning Image Classifier
Uses Kaggle CrisisMMD + Original Images.
Maps to 3 ResQ severities: high, medium, low

Uses a pre-trained ResNet18 for transfer learning.
Requires GPU for reasonable training times.

Usage:
    python train_image_dl.py
"""

import os
import sys
import time
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torchvision import transforms, models
from PIL import Image
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import numpy as np
import warnings
warnings.filterwarnings("ignore")

IMAGE_SIZE = 224
BATCH_SIZE = 64
EPOCHS = 5
LR = 1e-4

KAGGLE_IMG_DIR = os.path.join(os.path.dirname(__file__), "data", "kaggle", "working", "label_wise_images_of_balanced_data")
ORIG_IMG_DIR = os.path.join(os.path.dirname(__file__), "data", "images")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

# Class mapping to 0, 1, 2
SEVERITY_CLASSES = {"low": 0, "medium": 1, "high": 2}
IDX_TO_CLASS = {0: "low", 1: "medium", 2: "high"}

KAGGLE_CLASS_MAP = {
    "severe_damage": "high",
    "mild_damage": "medium",
    "little_or_no_damage": "low",
}

ORIG_CLASS_MAP = {
    "fire": "high",
    "flood": "high",
    "collapse": "high",
    "accident": "high",
    "violence": "high",
    "safe": "low",
}

def get_image_paths_and_labels():
    paths = []
    labels = []

    # 1. Kaggle Images
    if os.path.exists(KAGGLE_IMG_DIR):
        for folder_name, severity in KAGGLE_CLASS_MAP.items():
            folder_path = os.path.join(KAGGLE_IMG_DIR, folder_name)
            if not os.path.isdir(folder_path):
                continue
            for fname in os.listdir(folder_path):
                if fname.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp')):
                    paths.append(os.path.join(folder_path, fname))
                    labels.append(SEVERITY_CLASSES[severity])
                    
    # 2. Original Images
    if os.path.exists(ORIG_IMG_DIR):
        for folder_name, severity in ORIG_CLASS_MAP.items():
            folder_path = os.path.join(ORIG_IMG_DIR, folder_name)
            if not os.path.isdir(folder_path):
                continue
            for fname in os.listdir(folder_path):
                if fname.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp')):
                    paths.append(os.path.join(folder_path, fname))
                    labels.append(SEVERITY_CLASSES[severity])
                    
    return paths, labels

class EmergencyImageDataset(Dataset):
    def __init__(self, paths, labels, transform=None):
        self.paths = paths
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.paths)

    def __getitem__(self, idx):
        path = self.paths[idx]
        label = self.labels[idx]
        try:
            img = Image.open(path).convert('RGB')
        except Exception:
            # Fallback for corrupted images
            img = Image.new('RGB', (IMAGE_SIZE, IMAGE_SIZE), (255, 255, 255))
            
        if self.transform:
            img = self.transform(img)
            
        return img, label

def get_transforms():
    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomResizedCrop(IMAGE_SIZE, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                             std=[0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                             std=[0.229, 0.224, 0.225])
    ])
    
    return train_transform, val_transform

def train_model(model, train_loader, val_loader, criterion, optimizer, device):
    best_acc = 0.0
    
    for epoch in range(EPOCHS):
        print(f"\\nEpoch {epoch+1}/{EPOCHS}", flush=True)
        print("-" * 30, flush=True)
        
        # Training phase
        model.train()
        running_loss = 0.0
        running_corrects = 0
        total = 0
        
        for i, (inputs, labels) in enumerate(train_loader):
            inputs = inputs.to(device)
            labels = labels.to(device)
            
            optimizer.zero_grad()
            
            with torch.set_grad_enabled(True):
                outputs = model(inputs)
                _, preds = torch.max(outputs, 1)
                loss = criterion(outputs, labels)
                
                loss.backward()
                optimizer.step()
                
            running_loss += loss.item() * inputs.size(0)
            running_corrects += torch.sum(preds == labels.data)
            total += inputs.size(0)
            
            if (i+1) % 10 == 0:
                print(f"  Batch {i+1}/{len(train_loader)} - Loss: {running_loss/total:.4f} - Acc: {running_corrects.double()/total:.4f}", flush=True)
                
        epoch_loss = running_loss / total
        epoch_acc = running_corrects.double() / total
        print(f"  Train Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}", flush=True)
        
        # Validation phase
        model.eval()
        val_loss = 0.0
        val_corrects = 0
        val_total = 0
        
        all_preds = []
        all_labels = []
        
        for inputs, labels in val_loader:
            inputs = inputs.to(device)
            labels = labels.to(device)
            
            with torch.set_grad_enabled(False):
                outputs = model(inputs)
                _, preds = torch.max(outputs, 1)
                loss = criterion(outputs, labels)
                
            val_loss += loss.item() * inputs.size(0)
            val_corrects += torch.sum(preds == labels.data)
            val_total += inputs.size(0)
            
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            
        val_epoch_loss = val_loss / val_total
        val_epoch_acc = val_corrects.double() / val_total
        print(f"  Val Loss: {val_epoch_loss:.4f} Acc: {val_epoch_acc:.4f}", flush=True)
        
        if val_epoch_acc > best_acc:
            best_acc = val_epoch_acc
            # Save best model weights
            best_model_wts = model.state_dict()
            
    print(f"\\nBest Val Acc: {best_acc:.4f}", flush=True)
    model.load_state_dict(best_model_wts)
    return model, all_preds, all_labels, best_acc

def main():
    print("=" * 60)
    print("  ResQ Deep Learning Image Model Training (ResNet18)")
    print("=" * 60)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\\nUsing device: {device}")
    if device.type == 'cuda':
        print(f"GPU: {torch.cuda.get_device_name(0)}")

    paths, labels = get_image_paths_and_labels()
    
    if not paths:
        print("[ERROR] No images found!")
        sys.exit(1)
        
    print(f"\\nFound {len(paths)} images.")
    counts = {0: 0, 1: 0, 2: 0}
    for l in labels:
        counts[l] += 1
    print(f"  Low (0): {counts[0]}\\n  Medium (1): {counts[1]}\\n  High (2): {counts[2]}")
    
    # Stratified split
    train_paths, val_paths, train_labels, val_labels = train_test_split(
        paths, labels, test_size=0.2, random_state=42, stratify=labels
    )
    
    print(f"\\nTrain size: {len(train_paths)}, Val size: {len(val_paths)}")
    
    train_transform, val_transform = get_transforms()
    
    train_dataset = EmergencyImageDataset(train_paths, train_labels, train_transform)
    val_dataset = EmergencyImageDataset(val_paths, val_labels, val_transform)
    
    # Calculate class weights for imbalance
    class_counts = [counts[0], counts[1], counts[2]]
    total_samples = sum(class_counts)
    class_weights = [total_samples / c for c in class_counts]
    weights = torch.FloatTensor(class_weights).to(device)
    
    # Dataloaders
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    
    print("\\nInitializing ResNet18 model...", flush=True)
    # Using the new weights API
    try:
        model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    except:
        model = models.resnet18(pretrained=True)
        
    num_ftrs = model.fc.in_features
    # Replace final layer
    model.fc = nn.Linear(num_ftrs, 3)
    
    model = model.to(device)
    
    criterion = nn.CrossEntropyLoss(weight=weights)
    optimizer = optim.Adam(model.parameters(), lr=LR)
    
    t0 = time.time()
    
    # Train
    model, final_preds, final_labels, best_acc = train_model(
        model, train_loader, val_loader, criterion, optimizer, device
    )
    
    t1 = time.time()
    print(f"\\nTraining complete in {(t1-t0)/60:.1f} minutes.")
    
    print("\\nClassification Report (Validation Set):")
    # Convert labels to names
    target_names = ["low", "medium", "high"]
    print(classification_report(final_labels, final_preds, target_names=target_names))
    
    # Save the entire model using torch.save
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = os.path.join(MODEL_DIR, "image_dl_model.pth")
    torch.save(model.state_dict(), model_path)
    
    # Also save a TorchScript model for easier loading without architecture code
    model.eval()
    dummy_input = torch.randn(1, 3, 224, 224).to(device)
    traced_model = torch.jit.trace(model, dummy_input)
    traced_model.save(os.path.join(MODEL_DIR, "image_dl_model.pt"))
    
    print(f"\\nSaved PyTorch state_dict to: {model_path}")
    print(f"Saved TorchScript model to: {os.path.join(MODEL_DIR, 'image_dl_model.pt')}")
    
    # Save metadata
    meta = {
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_images": len(paths),
        "test_accuracy": round(float(best_acc), 4),
        "classes": target_names,
        "model_type": "ResNet18",
        "input_size": [3, 224, 224]
    }
    with open(os.path.join(MODEL_DIR, "image_dl_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

if __name__ == "__main__":
    # Freeze support for Windows DataLoader multiprocessing
    import multiprocessing
    multiprocessing.freeze_support()
    main()
