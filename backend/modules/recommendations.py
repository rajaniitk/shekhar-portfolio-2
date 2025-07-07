import pandas as pd
import numpy as np
from scipy import stats
from sklearn.feature_selection import mutual_info_regression, mutual_info_classif
from sklearn.preprocessing import LabelEncoder
import warnings
warnings.filterwarnings('ignore')

class RecommendationEngine:
    def __init__(self):
        self.recommendations = []
        self.priority_levels = ['HIGH', 'MEDIUM', 'LOW']
        self.categories = [
            'DATA_QUALITY', 'FEATURE_ENGINEERING', 'STATISTICAL_ANALYSIS', 
            'VISUALIZATION', 'MODEL_PREPARATION', 'PERFORMANCE_OPTIMIZATION'
        ]
    
    def generate_comprehensive_recommendations(self, df: pd.DataFrame, 
                                             target_column: str = None) -> dict:
        """Generate comprehensive recommendations for the dataset"""
        recommendations = {
            'data_quality': self._analyze_data_quality(df),
            'feature_engineering': self._recommend_feature_engineering(df, target_column),
            'statistical_analysis': self._recommend_statistical_tests(df),
            'visualization': self._recommend_visualizations(df),
            'model_preparation': self._recommend_model_preparation(df, target_column),
            'performance_optimization': self._recommend_performance_optimization(df)
        }
        
        # Generate overall insights
        recommendations['overall_insights'] = self._generate_overall_insights(df, recommendations)
        
        # Generate actionable steps
        recommendations['actionable_steps'] = self._generate_actionable_steps(recommendations)
        
        return recommendations
    
    def generate_eda_recommendations(self, df: pd.DataFrame, eda_results: dict) -> list:
        """Generate recommendations based on EDA results"""
        recommendations = []
        
        # Missing values recommendations
        missing_info = eda_results.get('missing_values', {})
        if missing_info.get('total_missing', 0) > 0:
            missing_percentage = missing_info.get('missing_percentage', 0)
            if missing_percentage > 50:
                recommendations.append({
                    'type': 'DATA_QUALITY',
                    'priority': 'HIGH',
                    'title': 'High Missing Data Alert',
                    'description': f'Dataset has {missing_percentage:.1f}% missing values. Consider data collection improvement or imputation strategies.',
                    'action': 'Review data collection process and implement robust imputation methods',
                    'code_suggestion': 'df.dropna() or df.fillna(method="appropriate_method")'
                })
            elif missing_percentage > 10:
                recommendations.append({
                    'type': 'DATA_QUALITY',
                    'priority': 'MEDIUM',
                    'title': 'Moderate Missing Data',
                    'description': f'Dataset has {missing_percentage:.1f}% missing values. Consider imputation strategies.',
                    'action': 'Apply appropriate imputation techniques based on data type and distribution',
                    'code_suggestion': 'Use mean/median for numeric, mode for categorical'
                })
        
        # Correlation recommendations
        correlation_info = eda_results.get('correlation_analysis', {})
        high_correlations = correlation_info.get('high_correlations', [])
        if len(high_correlations) > 0:
            recommendations.append({
                'type': 'FEATURE_ENGINEERING',
                'priority': 'MEDIUM',
                'title': 'High Correlation Detected',
                'description': f'Found {len(high_correlations)} pairs of highly correlated features. This may cause multicollinearity.',
                'action': 'Consider feature selection, PCA, or removing redundant features',
                'code_suggestion': 'df.corr() and remove features with correlation > 0.8'
            })
        
        # Data type recommendations
        dtype_info = eda_results.get('data_types', {})
        suggestions = dtype_info.get('suggestions', [])
        if suggestions:
            for suggestion in suggestions:
                recommendations.append({
                    'type': 'DATA_QUALITY',
                    'priority': 'LOW',
                    'title': 'Data Type Optimization',
                    'description': suggestion,
                    'action': 'Convert data types for better memory efficiency and performance',
                    'code_suggestion': 'pd.to_numeric() or astype("category")'
                })
        
        return recommendations
    
    def generate_comparison_recommendations(self, df: pd.DataFrame, columns: list, 
                                          comparison_results: dict) -> list:
        """Generate recommendations based on column comparison results"""
        recommendations = []
        
        pairwise = comparison_results.get('pairwise_comparisons', {})
        
        for comparison_key, result in pairwise.items():
            analysis_type = result.get('analysis_type')
            
            if analysis_type == 'numeric_numeric':
                pearson_corr = result.get('pearson_correlation', {})
                correlation = pearson_corr.get('coefficient', 0)
                significant = pearson_corr.get('significant', False)
                
                if abs(correlation) > 0.8 and significant:
                    recommendations.append({
                        'type': 'FEATURE_ENGINEERING',
                        'priority': 'HIGH',
                        'title': 'Strong Correlation Found',
                        'description': f'Very strong correlation ({correlation:.3f}) between columns. Consider feature selection.',
                        'action': 'Remove one of the highly correlated features or combine them',
                        'code_suggestion': f'Consider dropping one feature or creating combined feature'
                    })
                elif abs(correlation) > 0.5 and significant:
                    recommendations.append({
                        'type': 'STATISTICAL_ANALYSIS',
                        'priority': 'MEDIUM',
                        'title': 'Moderate Correlation',
                        'description': f'Moderate correlation ({correlation:.3f}) detected. May indicate relationship.',
                        'action': 'Investigate relationship further with scatter plots and regression analysis',
                        'code_suggestion': f'plt.scatter() and stats.linregress()'
                    })
            
            elif analysis_type == 'categorical_categorical':
                chi_square = result.get('chi_square_test', {})
                if chi_square.get('significant', False):
                    recommendations.append({
                        'type': 'STATISTICAL_ANALYSIS',
                        'priority': 'MEDIUM',
                        'title': 'Significant Association',
                        'description': 'Chi-square test indicates significant association between categorical variables.',
                        'action': 'Explore cross-tabulation and consider feature interactions',
                        'code_suggestion': 'pd.crosstab() for detailed analysis'
                    })
            
            elif analysis_type == 'numeric_categorical':
                anova = result.get('anova_test', {})
                if anova.get('significant', False):
                    recommendations.append({
                        'type': 'STATISTICAL_ANALYSIS',
                        'priority': 'MEDIUM',
                        'title': 'Significant Group Differences',
                        'description': 'ANOVA indicates significant differences between groups.',
                        'action': 'Perform post-hoc tests to identify which groups differ',
                        'code_suggestion': 'scipy.stats.tukey_hsd() for post-hoc analysis'
                    })
        
        return recommendations
    
    def _analyze_data_quality(self, df: pd.DataFrame) -> list:
        """Analyze data quality and provide recommendations"""
        recommendations = []
        
        # Missing values analysis
        missing_percentage = (df.isnull().sum().sum() / (df.shape[0] * df.shape[1])) * 100
        
        if missing_percentage > 30:
            recommendations.append({
                'type': 'DATA_QUALITY',
                'priority': 'HIGH',
                'title': 'Critical Missing Data Issue',
                'description': f'Dataset has {missing_percentage:.1f}% missing values across all columns.',
                'action': 'Urgent: Review data collection process and implement comprehensive imputation strategy',
                'impact': 'High - May severely affect model performance',
                'effort': 'High',
                'code_example': '''
# Multiple imputation strategy
from sklearn.impute import IterativeImputer
imputer = IterativeImputer(random_state=42)
df_imputed = pd.DataFrame(imputer.fit_transform(df_numeric), columns=df_numeric.columns)
                '''
            })
        
        # Duplicate rows
        duplicate_count = df.duplicated().sum()
        if duplicate_count > 0:
            duplicate_percentage = (duplicate_count / len(df)) * 100
            priority = 'HIGH' if duplicate_percentage > 10 else 'MEDIUM'
            recommendations.append({
                'type': 'DATA_QUALITY',
                'priority': priority,
                'title': 'Duplicate Rows Detected',
                'description': f'Found {duplicate_count} duplicate rows ({duplicate_percentage:.1f}%).',
                'action': 'Remove duplicate rows or investigate if they represent valid repeated measurements',
                'impact': 'Medium - May bias statistical analyses',
                'effort': 'Low',
                'code_example': '''
# Remove duplicates
df_cleaned = df.drop_duplicates()
print(f"Removed {len(df) - len(df_cleaned)} duplicate rows")
                '''
            })
        
        # Data consistency checks
        for col in df.select_dtypes(include=[np.number]).columns:
            if df[col].min() < 0 and 'age' in col.lower():
                recommendations.append({
                    'type': 'DATA_QUALITY',
                    'priority': 'HIGH',
                    'title': 'Impossible Age Values',
                    'description': f'Column "{col}" contains negative values, which is impossible for age.',
                    'action': 'Investigate and correct negative age values',
                    'impact': 'High - Data integrity issue',
                    'effort': 'Medium'
                })
        
        return recommendations
    
    def _recommend_feature_engineering(self, df: pd.DataFrame, target_column: str = None) -> list:
        """Recommend feature engineering techniques"""
        recommendations = []
        
        # Numeric features analysis
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        for col in numeric_columns:
            series = df[col].dropna()
            
            # Skewness check
            skewness = series.skew()
            if abs(skewness) > 2:
                recommendations.append({
                    'type': 'FEATURE_ENGINEERING',
                    'priority': 'MEDIUM',
                    'title': f'High Skewness in {col}',
                    'description': f'Column "{col}" has high skewness ({skewness:.2f}). Consider transformation.',
                    'action': 'Apply log transformation, Box-Cox, or other normalization techniques',
                    'impact': 'Medium - May improve model performance',
                    'effort': 'Low',
                    'code_example': f'''
# Log transformation
df["{col}_log"] = np.log1p(df["{col}"])

# Box-Cox transformation
from scipy.stats import boxcox
df["{col}_boxcox"], lambda_param = boxcox(df["{col}"] + 1)
                    '''
                })
            
            # Outlier detection
            Q1 = series.quantile(0.25)
            Q3 = series.quantile(0.75)
            IQR = Q3 - Q1
            outliers = series[(series < Q1 - 1.5 * IQR) | (series > Q3 + 1.5 * IQR)]
            
            if len(outliers) > 0.1 * len(series):
                recommendations.append({
                    'type': 'FEATURE_ENGINEERING',
                    'priority': 'MEDIUM',
                    'title': f'Outliers in {col}',
                    'description': f'Column "{col}" has {len(outliers)} outliers ({len(outliers)/len(series)*100:.1f}%).',
                    'action': 'Consider outlier treatment: capping, transformation, or removal',
                    'impact': 'Medium - Outliers may affect model performance',
                    'effort': 'Low',
                    'code_example': f'''
# Outlier capping
Q1 = df["{col}"].quantile(0.25)
Q3 = df["{col}"].quantile(0.75)
IQR = Q3 - Q1
df["{col}_capped"] = df["{col}"].clip(Q1 - 1.5*IQR, Q3 + 1.5*IQR)
                    '''
                })
        
        # Categorical features analysis
        categorical_columns = df.select_dtypes(include=['object', 'category']).columns
        for col in categorical_columns:
            unique_count = df[col].nunique()
            
            if unique_count > 50:
                recommendations.append({
                    'type': 'FEATURE_ENGINEERING',
                    'priority': 'HIGH',
                    'title': f'High Cardinality in {col}',
                    'description': f'Column "{col}" has {unique_count} unique categories. This may cause issues.',
                    'action': 'Consider frequency encoding, target encoding, or grouping rare categories',
                    'impact': 'High - May cause memory issues and poor model performance',
                    'effort': 'Medium',
                    'code_example': f'''
# Frequency encoding
freq_map = df["{col}"].value_counts().to_dict()
df["{col}_freq"] = df["{col}"].map(freq_map)

# Group rare categories
value_counts = df["{col}"].value_counts()
rare_categories = value_counts[value_counts < 10].index
df["{col}_grouped"] = df["{col}"].replace(rare_categories, "Other")
                    '''
                })
        
        # Feature interaction recommendations
        if len(numeric_columns) >= 2:
            recommendations.append({
                'type': 'FEATURE_ENGINEERING',
                'priority': 'LOW',
                'title': 'Feature Interactions',
                'description': 'Multiple numeric features available. Consider creating interaction features.',
                'action': 'Create polynomial features or custom interaction terms',
                'impact': 'Variable - May capture non-linear relationships',
                'effort': 'Medium',
                'code_example': '''
from sklearn.preprocessing import PolynomialFeatures
poly = PolynomialFeatures(degree=2, include_bias=False)
poly_features = poly.fit_transform(df[numeric_columns])
                '''
            })
        
        return recommendations
    
    def _recommend_statistical_tests(self, df: pd.DataFrame) -> list:
        """Recommend appropriate statistical tests"""
        recommendations = []
        
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        categorical_columns = df.select_dtypes(include=['object', 'category']).columns
        
        # Normality testing recommendation
        if len(numeric_columns) > 0:
            recommendations.append({
                'type': 'STATISTICAL_ANALYSIS',
                'priority': 'MEDIUM',
                'title': 'Normality Testing',
                'description': 'Test numeric columns for normal distribution to choose appropriate statistical tests.',
                'action': 'Perform Shapiro-Wilk or Kolmogorov-Smirnov tests',
                'impact': 'High - Determines choice of parametric vs non-parametric tests',
                'effort': 'Low',
                'code_example': '''
from scipy.stats import shapiro, kstest
for col in numeric_columns:
    stat, p_value = shapiro(df[col].dropna())
    print(f"{col}: Normal distribution = {p_value > 0.05}")
                '''
            })
        
        # Correlation analysis
        if len(numeric_columns) >= 2:
            recommendations.append({
                'type': 'STATISTICAL_ANALYSIS',
                'priority': 'MEDIUM',
                'title': 'Correlation Analysis',
                'description': 'Analyze relationships between numeric variables.',
                'action': 'Compute Pearson and Spearman correlations',
                'impact': 'Medium - Identifies feature relationships',
                'effort': 'Low',
                'code_example': '''
# Correlation matrix
correlation_matrix = df[numeric_columns].corr()
import seaborn as sns
sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm')
                '''
            })
        
        # Chi-square test for categorical variables
        if len(categorical_columns) >= 2:
            recommendations.append({
                'type': 'STATISTICAL_ANALYSIS',
                'priority': 'MEDIUM',
                'title': 'Categorical Association Testing',
                'description': 'Test for associations between categorical variables.',
                'action': 'Perform Chi-square tests of independence',
                'impact': 'Medium - Identifies categorical relationships',
                'effort': 'Low',
                'code_example': '''
from scipy.stats import chi2_contingency
for i, col1 in enumerate(categorical_columns):
    for col2 in categorical_columns[i+1:]:
        contingency_table = pd.crosstab(df[col1], df[col2])
        chi2, p_value, dof, expected = chi2_contingency(contingency_table)
        print(f"{col1} vs {col2}: Independent = {p_value > 0.05}")
                '''
            })
        
        return recommendations
    
    def _recommend_visualizations(self, df: pd.DataFrame) -> list:
        """Recommend appropriate visualizations"""
        recommendations = []
        
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        categorical_columns = df.select_dtypes(include=['object', 'category']).columns
        
        # Distribution visualizations
        if len(numeric_columns) > 0:
            recommendations.append({
                'type': 'VISUALIZATION',
                'priority': 'HIGH',
                'title': 'Distribution Analysis',
                'description': 'Visualize distributions of numeric variables for better understanding.',
                'action': 'Create histograms, box plots, and Q-Q plots',
                'impact': 'High - Essential for understanding data characteristics',
                'effort': 'Low',
                'code_example': '''
import matplotlib.pyplot as plt
import seaborn as sns

fig, axes = plt.subplots(len(numeric_columns), 3, figsize=(15, 5*len(numeric_columns)))
for i, col in enumerate(numeric_columns):
    # Histogram
    axes[i,0].hist(df[col].dropna(), bins=30)
    axes[i,0].set_title(f'Histogram of {col}')
    
    # Box plot
    axes[i,1].boxplot(df[col].dropna())
    axes[i,1].set_title(f'Box Plot of {col}')
    
    # Q-Q plot
    from scipy import stats
    stats.probplot(df[col].dropna(), dist="norm", plot=axes[i,2])
    axes[i,2].set_title(f'Q-Q Plot of {col}')
plt.tight_layout()
                '''
            })
        
        # Relationship visualizations
        if len(numeric_columns) >= 2:
            recommendations.append({
                'type': 'VISUALIZATION',
                'priority': 'MEDIUM',
                'title': 'Relationship Visualization',
                'description': 'Visualize relationships between variables.',
                'action': 'Create scatter plots, pair plots, and correlation heatmaps',
                'impact': 'Medium - Reveals patterns and relationships',
                'effort': 'Low',
                'code_example': '''
# Pair plot
sns.pairplot(df[numeric_columns])

# Correlation heatmap
plt.figure(figsize=(10, 8))
sns.heatmap(df[numeric_columns].corr(), annot=True, cmap='coolwarm', center=0)
                '''
            })
        
        # Categorical visualizations
        if len(categorical_columns) > 0:
            recommendations.append({
                'type': 'VISUALIZATION',
                'priority': 'MEDIUM',
                'title': 'Categorical Analysis',
                'description': 'Visualize categorical variable distributions.',
                'action': 'Create bar charts, pie charts, and count plots',
                'impact': 'Medium - Understanding categorical patterns',
                'effort': 'Low',
                'code_example': '''
fig, axes = plt.subplots(len(categorical_columns), 2, figsize=(12, 4*len(categorical_columns)))
for i, col in enumerate(categorical_columns):
    # Bar chart
    df[col].value_counts().plot(kind='bar', ax=axes[i,0])
    axes[i,0].set_title(f'Value Counts: {col}')
    
    # Pie chart
    df[col].value_counts().plot(kind='pie', ax=axes[i,1])
    axes[i,1].set_title(f'Distribution: {col}')
plt.tight_layout()
                '''
            })
        
        return recommendations
    
    def _recommend_model_preparation(self, df: pd.DataFrame, target_column: str = None) -> list:
        """Recommend model preparation steps"""
        recommendations = []
        
        if target_column and target_column in df.columns:
            # Target variable analysis
            target_series = df[target_column]
            
            if pd.api.types.is_numeric_dtype(target_series):
                if target_series.nunique() <= 10:
                    task_type = 'classification'
                else:
                    task_type = 'regression'
            else:
                task_type = 'classification'
            
            recommendations.append({
                'type': 'MODEL_PREPARATION',
                'priority': 'HIGH',
                'title': f'{task_type.title()} Task Identified',
                'description': f'Based on target variable analysis, this appears to be a {task_type} problem.',
                'action': f'Prepare features for {task_type} modeling',
                'impact': 'High - Determines modeling approach',
                'effort': 'Medium',
                'code_example': f'''
# For {task_type}
X = df.drop(columns=["{target_column}"])
y = df["{target_column}"]

from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
                '''
            })
        
        # Feature scaling recommendation
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        if len(numeric_columns) > 1:
            # Check if scaling is needed
            ranges = df[numeric_columns].max() - df[numeric_columns].min()
            max_range = ranges.max()
            min_range = ranges.min()
            
            if max_range / min_range > 10:
                recommendations.append({
                    'type': 'MODEL_PREPARATION',
                    'priority': 'MEDIUM',
                    'title': 'Feature Scaling Required',
                    'description': 'Features have very different scales. Scaling is recommended for most ML algorithms.',
                    'action': 'Apply StandardScaler, MinMaxScaler, or RobustScaler',
                    'impact': 'High - Essential for many ML algorithms',
                    'effort': 'Low',
                    'code_example': '''
from sklearn.preprocessing import StandardScaler
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X[numeric_columns])
                    '''
                })
        
        # Encoding recommendation for categorical variables
        categorical_columns = df.select_dtypes(include=['object', 'category']).columns
        if len(categorical_columns) > 0:
            recommendations.append({
                'type': 'MODEL_PREPARATION',
                'priority': 'HIGH',
                'title': 'Categorical Encoding Required',
                'description': 'Categorical variables need to be encoded for most ML algorithms.',
                'action': 'Apply appropriate encoding (OneHot, Label, Target encoding)',
                'impact': 'High - Required for ML algorithms',
                'effort': 'Medium',
                'code_example': '''
# One-hot encoding for low cardinality
from sklearn.preprocessing import OneHotEncoder
encoder = OneHotEncoder(sparse=False, handle_unknown='ignore')

# Label encoding for ordinal variables
from sklearn.preprocessing import LabelEncoder
label_encoder = LabelEncoder()
                '''
            })
        
        return recommendations
    
    def _recommend_performance_optimization(self, df: pd.DataFrame) -> list:
        """Recommend performance optimization techniques"""
        recommendations = []
        
        # Memory optimization
        memory_usage = df.memory_usage(deep=True).sum() / 1024 / 1024  # MB
        
        if memory_usage > 100:
            recommendations.append({
                'type': 'PERFORMANCE_OPTIMIZATION',
                'priority': 'MEDIUM',
                'title': 'Memory Optimization',
                'description': f'Dataset uses {memory_usage:.1f} MB of memory. Consider optimization.',
                'action': 'Optimize data types, use categorical types, consider chunking for large datasets',
                'impact': 'Medium - Improves processing speed and reduces memory usage',
                'effort': 'Medium',
                'code_example': '''
# Optimize data types
for col in df.select_dtypes(include=['object']).columns:
    if df[col].nunique() / len(df) < 0.5:
        df[col] = df[col].astype('category')

# Downcast numeric types
for col in df.select_dtypes(include=['int64']).columns:
    df[col] = pd.to_numeric(df[col], downcast='integer')

for col in df.select_dtypes(include=['float64']).columns:
    df[col] = pd.to_numeric(df[col], downcast='float')
                '''
            })
        
        # Feature selection recommendation
        if df.shape[1] > 50:
            recommendations.append({
                'type': 'PERFORMANCE_OPTIMIZATION',
                'priority': 'MEDIUM',
                'title': 'Feature Selection',
                'description': f'Dataset has {df.shape[1]} features. Consider feature selection to improve performance.',
                'action': 'Apply univariate selection, recursive feature elimination, or feature importance',
                'impact': 'Medium - Improves model performance and training speed',
                'effort': 'Medium',
                'code_example': '''
from sklearn.feature_selection import SelectKBest, f_classif
selector = SelectKBest(score_func=f_classif, k=20)
X_selected = selector.fit_transform(X, y)

# Or use feature importance from tree-based models
from sklearn.ensemble import RandomForestClassifier
rf = RandomForestClassifier()
rf.fit(X, y)
feature_importance = pd.Series(rf.feature_importances_, index=X.columns).sort_values(ascending=False)
                '''
            })
        
        return recommendations
    
    def _generate_overall_insights(self, df: pd.DataFrame, recommendations: dict) -> list:
        """Generate high-level insights about the dataset"""
        insights = []
        
        # Dataset size insight
        data_points = df.shape[0] * df.shape[1]
        if data_points > 1000000:
            insights.append({
                'category': 'DATASET_SIZE',
                'title': 'Large Dataset Detected',
                'description': f'Your dataset has {data_points:,} data points. This is considered large and may require special handling.',
                'implications': ['Longer processing times', 'Memory considerations', 'Potential for robust models'],
                'recommendations': ['Consider sampling for initial exploration', 'Use efficient algorithms', 'Monitor memory usage']
            })
        
        # Data quality insight
        missing_percentage = (df.isnull().sum().sum() / data_points) * 100
        if missing_percentage < 5:
            insights.append({
                'category': 'DATA_QUALITY',
                'title': 'High Data Quality',
                'description': f'Your dataset has excellent data quality with only {missing_percentage:.1f}% missing values.',
                'implications': ['Reliable analysis results', 'Minimal preprocessing needed', 'Strong foundation for modeling'],
                'recommendations': ['Proceed with analysis', 'Focus on feature engineering', 'Consider advanced techniques']
            })
        
        # Feature diversity insight
        numeric_ratio = len(df.select_dtypes(include=[np.number]).columns) / df.shape[1]
        if numeric_ratio > 0.8:
            insights.append({
                'category': 'FEATURE_COMPOSITION',
                'title': 'Numeric-Heavy Dataset',
                'description': f'{numeric_ratio*100:.1f}% of your features are numeric.',
                'implications': ['Rich statistical analysis possible', 'Direct ML algorithm application', 'Good for mathematical modeling'],
                'recommendations': ['Explore correlations thoroughly', 'Consider dimensionality reduction', 'Try various scaling techniques']
            })
        elif numeric_ratio < 0.3:
            insights.append({
                'category': 'FEATURE_COMPOSITION',
                'title': 'Categorical-Heavy Dataset',
                'description': f'{(1-numeric_ratio)*100:.1f}% of your features are categorical.',
                'implications': ['Rich categorical analysis needed', 'Encoding strategies crucial', 'Text/NLP techniques may apply'],
                'recommendations': ['Focus on categorical analysis', 'Explore encoding techniques', 'Consider ensemble methods']
            })
        
        return insights
    
    def _generate_actionable_steps(self, recommendations: dict) -> list:
        """Generate prioritized actionable steps"""
        all_recommendations = []
        
        # Flatten all recommendations
        for category, recs in recommendations.items():
            if isinstance(recs, list):
                for rec in recs:
                    rec['category'] = category
                    all_recommendations.append(rec)
        
        # Sort by priority
        priority_order = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}
        all_recommendations.sort(key=lambda x: priority_order.get(x.get('priority', 'LOW'), 2))
        
        # Generate step-by-step action plan
        action_plan = []
        high_priority = [r for r in all_recommendations if r.get('priority') == 'HIGH']
        medium_priority = [r for r in all_recommendations if r.get('priority') == 'MEDIUM']
        low_priority = [r for r in all_recommendations if r.get('priority') == 'LOW']
        
        action_plan.append({
            'phase': 'Immediate Actions (High Priority)',
            'description': 'Critical issues that should be addressed first',
            'actions': high_priority[:5],  # Top 5 high priority
            'estimated_time': '1-2 hours'
        })
        
        action_plan.append({
            'phase': 'Short-term Improvements (Medium Priority)',
            'description': 'Important enhancements for better analysis',
            'actions': medium_priority[:5],  # Top 5 medium priority
            'estimated_time': '2-4 hours'
        })
        
        action_plan.append({
            'phase': 'Long-term Optimizations (Low Priority)',
            'description': 'Nice-to-have improvements for optimization',
            'actions': low_priority[:5],  # Top 5 low priority
            'estimated_time': '4+ hours'
        })
        
        return action_plan